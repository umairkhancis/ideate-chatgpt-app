"""Generic data store for domain models.

This module provides a generic CRUD interface for any domain model
defined by configuration. Uses SQLite with JSON storage for flexibility.

Follows SOLID principles:
- Single Responsibility: Only handles data persistence
- Open/Closed: Open for extension via config, closed for modification
- Liskov Substitution: Can replace IdeaStore with GenericStore
- Interface Segregation: Clean, minimal interface
- Dependency Inversion: Depends on config abstraction
"""

import sqlite3
import json
import uuid
import os
from datetime import datetime
from typing import List, Dict, Optional, Any
from config_loader import DomainConfig, FieldConfig


class GenericEntity:
    """Represents a generic domain entity with dynamic fields."""

    def __init__(self, config: DomainConfig, **kwargs):
        """Initialize entity with config and field values.

        Args:
            config: DomainConfig defining the entity structure
            **kwargs: Field values
        """
        self.config = config
        self.id = kwargs.get('id', str(uuid.uuid4()))
        self.archived = kwargs.get('archived', False)
        self.created_date = kwargs.get(
            'created_date', datetime.now().isoformat())
        self.updated_date = kwargs.get(
            'updated_date', datetime.now().isoformat())

        # Store all field values
        self.data: Dict[str, Any] = {}
        for field in config.fields:
            if field.key in kwargs:
                self.data[field.key] = kwargs[field.key]
            elif field.default is not None:
                self.data[field.key] = field.default

    def to_dict(self) -> Dict[str, Any]:
        """Convert entity to dictionary."""
        result = {
            'id': self.id,
            'archived': self.archived,
            'created_date': self.created_date,
            'updated_date': self.updated_date,
            **self.data
        }
        return result

    def update(self, **kwargs) -> None:
        """Update entity fields.

        Args:
            **kwargs: Field values to update
        """
        # Update standard fields
        if 'archived' in kwargs:
            self.archived = bool(kwargs['archived'])

        # Update custom fields
        for field in self.config.fields:
            if field.key in kwargs and kwargs[field.key] is not None:
                self.data[field.key] = kwargs[field.key]

        self.updated_date = datetime.now().isoformat()

    def validate(self) -> List[str]:
        """Validate entity against config rules.

        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []

        for field in self.config.get_required_fields():
            value = self.data.get(field.key)
            if value is None or (isinstance(value, str) and not value.strip()):
                errors.append(f"Field '{field.label}' is required")

        # Type and range validation for number fields
        for field in self.config.fields:
            value = self.data.get(field.key)
            if value is not None and field.type == 'number':
                try:
                    num_value = float(value)
                    if field.min_value is not None and num_value < field.min_value:
                        errors.append(
                            f"Field '{field.label}' must be at least {field.min_value}"
                        )
                    if field.max_value is not None and num_value > field.max_value:
                        errors.append(
                            f"Field '{field.label}' must be at most {field.max_value}"
                        )
                except (ValueError, TypeError):
                    errors.append(f"Field '{field.label}' must be a number")

        return errors


class GenericStore:
    """Generic persistence layer for domain entities.

    Uses SQLite with JSON storage for maximum flexibility.
    Each domain gets its own table with structure:
    - id (TEXT PRIMARY KEY)
    - data (JSON) - all custom fields
    - archived (INTEGER) - 0/1 flag
    - created_date (TEXT) - ISO8601
    - updated_date (TEXT) - ISO8601
    """

    def __init__(self, config: DomainConfig, db_path: Optional[str] = None):
        """Initialize store for a domain model.

        Args:
            config: DomainConfig defining the domain structure
            db_path: Path to SQLite database file (defaults to {domain}.db)
        """
        self.config = config
        self.db_path = db_path or f"{config.domain}.db"
        self.table_name = config.domain
        self._ensure_db()

    def _connect(self) -> sqlite3.Connection:
        """Create database connection."""
        return sqlite3.connect(self.db_path)

    def _ensure_db(self) -> None:
        """Ensure database and table exist."""
        # Create directory if needed
        directory = os.path.dirname(self.db_path)
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)

        with self._connect() as conn:
            # Create table with generic structure
            conn.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {self.table_name} (
                    id TEXT PRIMARY KEY,
                    data TEXT NOT NULL,
                    archived INTEGER NOT NULL DEFAULT 0,
                    created_date TEXT NOT NULL,
                    updated_date TEXT NOT NULL
                )
                """
            )

            # Create indexes for common queries
            conn.execute(
                f"CREATE INDEX IF NOT EXISTS idx_{self.table_name}_archived "
                f"ON {self.table_name}(archived)"
            )
            conn.execute(
                f"CREATE INDEX IF NOT EXISTS idx_{self.table_name}_created "
                f"ON {self.table_name}(created_date)"
            )
            conn.commit()

    def _row_to_entity(self, row: tuple) -> GenericEntity:
        """Convert database row to entity.

        Args:
            row: Database row tuple (id, data, archived, created_date, updated_date)

        Returns:
            GenericEntity instance
        """
        entity_id, data_json, archived, created_date, updated_date = row

        # Parse JSON data
        try:
            data = json.loads(data_json)
        except json.JSONDecodeError:
            data = {}

        # Remove system fields from data to avoid conflicts
        system_fields = {'id', 'archived', 'created_date', 'updated_date'}
        filtered_data = {k: v for k,
                         v in data.items() if k not in system_fields}

        # Create entity with all fields
        entity = GenericEntity(
            self.config,
            id=entity_id,
            archived=bool(archived),
            created_date=created_date,
            updated_date=updated_date,
            **filtered_data
        )

        return entity

    def create(self, **kwargs) -> GenericEntity:
        """Create a new entity.

        Args:
            **kwargs: Field values

        Returns:
            Created entity

        Raises:
            ValueError: If validation fails
        """
        entity = GenericEntity(self.config, **kwargs)

        # Validate
        errors = entity.validate()
        if errors:
            raise ValueError(f"Validation failed: {'; '.join(errors)}")

        # Insert into database
        with self._connect() as conn:
            conn.execute(
                f"""
                INSERT INTO {self.table_name} 
                (id, data, archived, created_date, updated_date)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    entity.id,
                    json.dumps(entity.data),
                    1 if entity.archived else 0,
                    entity.created_date,
                    entity.updated_date
                )
            )
            conn.commit()

        return entity

    def get(self, entity_id: str) -> Optional[GenericEntity]:
        """Get entity by ID.

        Args:
            entity_id: Entity ID

        Returns:
            Entity or None if not found
        """
        with self._connect() as conn:
            cur = conn.execute(
                f"""
                SELECT id, data, archived, created_date, updated_date
                FROM {self.table_name}
                WHERE id = ?
                """,
                (entity_id,)
            )
            row = cur.fetchone()

        return self._row_to_entity(row) if row else None

    def get_all(
        self,
        include_archived: bool = False,
        archived_only: bool = False
    ) -> List[GenericEntity]:
        """Get all entities with optional filtering.

        Args:
            include_archived: Include archived entities
            archived_only: Return only archived entities

        Returns:
            List of entities
        """
        with self._connect() as conn:
            if archived_only:
                query = f"""
                    SELECT id, data, archived, created_date, updated_date
                    FROM {self.table_name}
                    WHERE archived = 1
                    ORDER BY created_date DESC
                """
            elif not include_archived:
                query = f"""
                    SELECT id, data, archived, created_date, updated_date
                    FROM {self.table_name}
                    WHERE archived = 0
                    ORDER BY created_date DESC
                """
            else:
                query = f"""
                    SELECT id, data, archived, created_date, updated_date
                    FROM {self.table_name}
                    ORDER BY created_date DESC
                """

            cur = conn.execute(query)
            rows = cur.fetchall()

        return [self._row_to_entity(row) for row in rows]

    def update(self, entity_id: str, **kwargs) -> Optional[GenericEntity]:
        """Update an existing entity.

        Args:
            entity_id: Entity ID
            **kwargs: Fields to update

        Returns:
            Updated entity or None if not found

        Raises:
            ValueError: If validation fails
        """
        entity = self.get(entity_id)
        if not entity:
            return None

        entity.update(**kwargs)

        # Validate
        errors = entity.validate()
        if errors:
            raise ValueError(f"Validation failed: {'; '.join(errors)}")

        # Update in database
        with self._connect() as conn:
            conn.execute(
                f"""
                UPDATE {self.table_name}
                SET data = ?, archived = ?, updated_date = ?
                WHERE id = ?
                """,
                (
                    json.dumps(entity.data),
                    1 if entity.archived else 0,
                    entity.updated_date,
                    entity.id
                )
            )
            conn.commit()

        return entity

    def delete(self, entity_id: str) -> bool:
        """Delete an entity permanently.

        Args:
            entity_id: Entity ID

        Returns:
            True if deleted, False if not found
        """
        with self._connect() as conn:
            cur = conn.execute(
                f"DELETE FROM {self.table_name} WHERE id = ?",
                (entity_id,)
            )
            conn.commit()
            return cur.rowcount > 0

    def is_empty(self) -> bool:
        """Check if store is empty.

        Returns:
            True if no entities exist
        """
        with self._connect() as conn:
            cur = conn.execute(
                f"SELECT COUNT(1) FROM {self.table_name}"
            )
            (count,) = cur.fetchone()
        return count == 0

    def count(self, include_archived: bool = True) -> int:
        """Count entities.

        Args:
            include_archived: Include archived entities in count

        Returns:
            Entity count
        """
        with self._connect() as conn:
            if include_archived:
                query = f"SELECT COUNT(1) FROM {self.table_name}"
            else:
                query = f"SELECT COUNT(1) FROM {self.table_name} WHERE archived = 0"

            cur = conn.execute(query)
            (count,) = cur.fetchone()
        return count
