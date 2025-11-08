"""Generic REST API for domain models.

This module provides generic CRUD endpoints for any domain model
defined by configuration. Follows RESTful conventions and Flask-RESTful patterns.

Endpoints:
- GET    /{domain}           - List all entities
- POST   /{domain}           - Create new entity
- GET    /{domain}/{id}      - Get specific entity
- PUT    /{domain}/{id}      - Update entity
- DELETE /{domain}/{id}      - Delete entity
- POST   /{domain}/{id}/archive  - Archive entity (if enabled)
- POST   /{domain}/{id}/restore  - Restore entity (if enabled)
"""

from flask import request, jsonify, Blueprint
from flask_restful import Api, Resource
from typing import Dict, Any
from config_loader import DomainConfig
from generic_store import GenericStore


def create_generic_blueprint(config: DomainConfig, store: GenericStore) -> Blueprint:
    """Factory function to create a generic REST API blueprint.

    This follows the Factory pattern for creating configured API endpoints.

    Args:
        config: DomainConfig defining the domain structure
        store: GenericStore instance for data persistence

    Returns:
        Flask Blueprint with registered routes
    """
    # Create blueprint with dynamic name
    bp = Blueprint(f'{config.domain}_api', __name__)
    api = Api(bp)

    # Closure to share config and store with resource classes
    class EntityListResource(Resource):
        """Resource for entity collection operations."""

        def get(self):
            """Get all entities with optional filtering.

            Query Parameters:
                includeArchived (bool): Include archived entities
                archivedOnly (bool): Return only archived entities

            Returns:
                JSON array of entities
            """
            include_archived = request.args.get(
                'includeArchived', 'false'
            ).lower() == 'true'
            archived_only = request.args.get(
                'archivedOnly', 'false'
            ).lower() == 'true'

            entities = store.get_all(
                include_archived=include_archived,
                archived_only=archived_only
            )

            return [entity.to_dict() for entity in entities]

        def post(self):
            """Create a new entity.

            Request Body:
                JSON object with field values matching config

            Returns:
                201: Created entity
                400: Validation error
            """
            data = request.get_json()

            if not data:
                return {'error': 'No data provided'}, 400

            # Validate required fields
            missing_fields = []
            for field in config.get_required_fields():
                if field.key not in data or not data[field.key]:
                    missing_fields.append(field.label)

            if missing_fields:
                return {
                    'error': f"Required fields missing: {', '.join(missing_fields)}"
                }, 400

            # Create entity
            try:
                entity = store.create(**data)
                return entity.to_dict(), 201
            except ValueError as e:
                return {'error': str(e)}, 400

    class EntityResource(Resource):
        """Resource for individual entity operations."""

        def get(self, entity_id: str):
            """Get a specific entity.

            Args:
                entity_id: Entity ID

            Returns:
                200: Entity data
                404: Entity not found
            """
            entity = store.get(entity_id)
            if not entity:
                return {'error': f'{config.label} not found'}, 404
            return entity.to_dict()

        def put(self, entity_id: str):
            """Update an existing entity.

            Args:
                entity_id: Entity ID

            Request Body:
                JSON object with fields to update

            Returns:
                200: Updated entity
                404: Entity not found
                400: Validation error
            """
            entity = store.get(entity_id)
            if not entity:
                return {'error': f'{config.label} not found'}, 404

            data = request.get_json()
            if not data:
                return {'error': 'No data provided'}, 400

            # Update entity
            try:
                updated_entity = store.update(entity_id, **data)
                return updated_entity.to_dict()
            except ValueError as e:
                return {'error': str(e)}, 400

        def delete(self, entity_id: str):
            """Delete an entity permanently.

            Args:
                entity_id: Entity ID

            Returns:
                200: Success message
                404: Entity not found
            """
            if store.delete(entity_id):
                return {'message': f'{config.label} deleted successfully'}
            return {'error': f'{config.label} not found'}, 404

    class EntityArchiveResource(Resource):
        """Resource for archiving entities."""

        def post(self, entity_id: str):
            """Archive an entity.

            Args:
                entity_id: Entity ID

            Returns:
                200: Success message
                404: Entity not found
                400: Archive feature not enabled
            """
            if not config.features.archive:
                return {
                    'error': 'Archive feature not enabled for this domain'
                }, 400

            entity = store.get(entity_id)
            if not entity:
                return {'error': f'{config.label} not found'}, 404

            if not entity.archived:
                store.update(entity_id, archived=True)

            return {
                'message': f'{config.label} archived',
                'id': entity_id
            }

    class EntityRestoreResource(Resource):
        """Resource for restoring archived entities."""

        def post(self, entity_id: str):
            """Restore (unarchive) an entity.

            Args:
                entity_id: Entity ID

            Returns:
                200: Success message
                404: Entity not found
                400: Archive feature not enabled
            """
            if not config.features.archive:
                return {
                    'error': 'Archive feature not enabled for this domain'
                }, 400

            entity = store.get(entity_id)
            if not entity:
                return {'error': f'{config.label} not found'}, 404

            if entity.archived:
                store.update(entity_id, archived=False)

            return {
                'message': f'{config.label} restored',
                'id': entity_id
            }

    # Register routes
    domain_path = f'/{config.domain}'
    api.add_resource(EntityListResource, domain_path)
    api.add_resource(EntityResource, f'{domain_path}/<string:entity_id>')

    # Conditionally register archive/restore endpoints
    if config.features.archive:
        api.add_resource(
            EntityArchiveResource,
            f'{domain_path}/<string:entity_id>/archive'
        )
        api.add_resource(
            EntityRestoreResource,
            f'{domain_path}/<string:entity_id>/restore'
        )

    # Add config info endpoint
    @bp.route(f'{domain_path}/config')
    def get_config():
        """Get domain configuration (for debugging/UI).

        Returns:
            JSON configuration object
        """
        return jsonify(config.to_dict())

    return bp


def seed_sample_data(config: DomainConfig, store: GenericStore) -> None:
    """Seed sample data for a domain (for demo purposes).

    Args:
        config: DomainConfig defining the domain
        store: GenericStore to populate
    """
    if not store.is_empty():
        return  # Don't seed if data exists

    # Generate sample data based on domain
    if config.domain == 'products':
        samples = [
            {
                'name': 'Wireless Mouse',
                'description': 'Ergonomic wireless mouse with long battery life',
                'price': 29.99,
                'stock': 150,
                'priority': 4
            },
            {
                'name': 'USB-C Hub',
                'description': 'Multi-port USB-C hub with HDMI and Ethernet',
                'price': 49.99,
                'stock': 75,
                'priority': 5
            },
            {
                'name': 'Laptop Stand',
                'description': 'Adjustable aluminum laptop stand',
                'price': 39.99,
                'stock': 200,
                'priority': 3
            }
        ]
    elif config.domain == 'customers':
        samples = [
            {
                'name': 'John Doe',
                'email': 'john@example.com',
                'phone': '+1-555-0123',
                'status': 'active'
            },
            {
                'name': 'Jane Smith',
                'email': 'jane@example.com',
                'phone': '+1-555-0456',
                'status': 'active'
            }
        ]
    elif config.domain == 'tasks':
        samples = [
            {
                'title': 'Complete project proposal',
                'description': 'Draft and submit Q1 project proposal',
                'status': 'in_progress',
                'priority': 5
            },
            {
                'title': 'Review team feedback',
                'description': 'Review and respond to team survey results',
                'status': 'pending',
                'priority': 3
            }
        ]
    else:
        # Generic sample for unknown domains
        samples = [
            {field.key: f"Sample {field.label}"
             for field in config.fields
             if field.required and field.type == 'string'}
        ]

    # Create sample entities
    for sample in samples:
        try:
            store.create(**sample)
        except Exception as e:
            print(f"Warning: Could not seed sample data: {e}")
