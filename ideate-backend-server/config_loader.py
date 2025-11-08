"""Configuration loader for domain model definitions.

This module provides utilities to load and validate domain configuration files.
Follows single responsibility principle - only handles config loading.
"""

import json
import os
from typing import Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class FieldConfig:
    """Represents a single field configuration."""
    key: str
    label: str
    type: str
    required: bool = False
    hidden: bool = False
    show_in_list: bool = False
    show_in_detail: bool = True
    placeholder: Optional[str] = None
    help_text: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    default: Any = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FieldConfig':
        """Create FieldConfig from dictionary."""
        return cls(
            key=data['key'],
            label=data['label'],
            type=data['type'],
            required=data.get('required', False),
            hidden=data.get('hidden', False),
            show_in_list=data.get('showInList', False),
            show_in_detail=data.get('showInDetail', True),
            placeholder=data.get('placeholder'),
            help_text=data.get('helpText'),
            min_value=data.get('min'),
            max_value=data.get('max'),
            default=data.get('default')
        )


@dataclass
class BrandingConfig:
    """Represents branding configuration."""
    primary_color: str = "#3B82F6"
    secondary_color: str = "#10B981"
    logo: Optional[str] = None

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BrandingConfig':
        """Create BrandingConfig from dictionary."""
        return cls(
            primary_color=data.get('primaryColor', "#3B82F6"),
            secondary_color=data.get('secondaryColor', "#10B981"),
            logo=data.get('logo')
        )


@dataclass
class FeaturesConfig:
    """Represents feature flags."""
    create: bool = True
    update: bool = True
    delete: bool = True
    archive: bool = False
    search: bool = False

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FeaturesConfig':
        """Create FeaturesConfig from dictionary."""
        return cls(
            create=data.get('create', True),
            update=data.get('update', True),
            delete=data.get('delete', True),
            archive=data.get('archive', False),
            search=data.get('search', False)
        )


@dataclass
class DomainConfig:
    """Represents a complete domain model configuration."""
    domain: str
    label: str
    label_plural: str
    fields: list[FieldConfig] = field(default_factory=list)
    icon: Optional[str] = None
    description: Optional[str] = None
    branding: BrandingConfig = field(default_factory=BrandingConfig)
    features: FeaturesConfig = field(default_factory=FeaturesConfig)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DomainConfig':
        """Create DomainConfig from dictionary."""
        fields = [FieldConfig.from_dict(f) for f in data.get('fields', [])]
        branding = BrandingConfig.from_dict(data.get('branding', {}))
        features = FeaturesConfig.from_dict(data.get('features', {}))
        
        return cls(
            domain=data['domain'],
            label=data['label'],
            label_plural=data['labelPlural'],
            fields=fields,
            icon=data.get('icon'),
            description=data.get('description'),
            branding=branding,
            features=features
        )

    def get_field(self, key: str) -> Optional[FieldConfig]:
        """Get field config by key."""
        return next((f for f in self.fields if f.key == key), None)

    def get_required_fields(self) -> list[FieldConfig]:
        """Get list of required fields."""
        return [f for f in self.fields if f.required and not f.hidden]

    def get_list_fields(self) -> list[FieldConfig]:
        """Get fields to show in list view."""
        return [f for f in self.fields if f.show_in_list and not f.hidden]

    def get_detail_fields(self) -> list[FieldConfig]:
        """Get fields to show in detail view."""
        return [f for f in self.fields if f.show_in_detail and not f.hidden]

    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary for JSON serialization."""
        return {
            'domain': self.domain,
            'label': self.label,
            'labelPlural': self.label_plural,
            'icon': self.icon,
            'description': self.description,
            'branding': {
                'primaryColor': self.branding.primary_color,
                'secondaryColor': self.branding.secondary_color,
                'logo': self.branding.logo
            },
            'features': {
                'create': self.features.create,
                'update': self.features.update,
                'delete': self.features.delete,
                'archive': self.features.archive,
                'search': self.features.search
            },
            'fields': [
                {
                    'key': f.key,
                    'label': f.label,
                    'type': f.type,
                    'required': f.required,
                    'hidden': f.hidden,
                    'showInList': f.show_in_list,
                    'showInDetail': f.show_in_detail,
                    'placeholder': f.placeholder,
                    'helpText': f.help_text,
                    'min': f.min_value,
                    'max': f.max_value,
                    'default': f.default
                }
                for f in self.fields
            ]
        }


class ConfigLoader:
    """Loads and caches domain configuration."""
    
    _instance: Optional['ConfigLoader'] = None
    _config: Optional[DomainConfig] = None
    
    def __new__(cls):
        """Singleton pattern to ensure single config instance."""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def load(self, config_path: Optional[str] = None) -> DomainConfig:
        """Load configuration from file or environment variable.
        
        Args:
            config_path: Path to config file. If None, reads from DOMAIN_CONFIG env var.
            
        Returns:
            DomainConfig instance
            
        Raises:
            FileNotFoundError: If config file doesn't exist
            ValueError: If config is invalid
        """
        if self._config is not None:
            return self._config
            
        # Determine config path
        if config_path is None:
            config_path = os.environ.get('DOMAIN_CONFIG')
            
        if not config_path:
            raise ValueError(
                "No configuration specified. Set DOMAIN_CONFIG env var or pass config_path"
            )
            
        # Load and parse JSON
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except FileNotFoundError:
            raise FileNotFoundError(f"Config file not found: {config_path}")
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in config file: {e}")
            
        # Validate required fields
        required = ['domain', 'label', 'labelPlural', 'fields']
        missing = [r for r in required if r not in data]
        if missing:
            raise ValueError(f"Config missing required fields: {', '.join(missing)}")
            
        # Parse and cache config
        self._config = DomainConfig.from_dict(data)
        return self._config
    
    def get(self) -> Optional[DomainConfig]:
        """Get cached config (returns None if not loaded)."""
        return self._config
    
    def reload(self, config_path: Optional[str] = None) -> DomainConfig:
        """Force reload configuration."""
        self._config = None
        return self.load(config_path)


def load_config(config_path: Optional[str] = None) -> DomainConfig:
    """Convenience function to load domain configuration.
    
    Args:
        config_path: Path to config file. If None, reads from DOMAIN_CONFIG env var.
        
    Returns:
        DomainConfig instance
    """
    loader = ConfigLoader()
    return loader.load(config_path)


def get_config() -> Optional[DomainConfig]:
    """Get cached configuration (returns None if not loaded)."""
    loader = ConfigLoader()
    return loader.get()

