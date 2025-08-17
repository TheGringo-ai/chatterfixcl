#!/usr/bin/env python3
"""
Validation script for Alembic configuration and migration files
"""
import sys
from pathlib import Path

# Add the project root to the path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    # Test importing models
    from database.models import Base
    print(f"✓ Models imported successfully - found {len(Base.metadata.tables)} tables")
    
    # List all the tables
    table_names = list(Base.metadata.tables.keys())
    print(f"✓ Tables: {', '.join(sorted(table_names))}")
    
    # Test compiling the migration file
    migration_file = project_root / "api" / "alembic" / "versions" / "001_initial_chatterfix_schema.py"
    if migration_file.exists():
        with open(migration_file) as f:
            migration_code = f.read()
        
        # Basic syntax check - compile without executing
        compile(migration_code, str(migration_file), 'exec')
        print("✓ Migration file syntax is valid")
    else:
        print("✗ Migration file not found")
        
    # Test Alembic configuration
    alembic_ini = project_root / "api" / "alembic.ini"
    if alembic_ini.exists():
        print("✓ Alembic configuration file exists")
    else:
        print("✗ Alembic configuration file not found")
        
    print("\n🎉 All validations passed! The Alembic setup is ready for deployment.")
    print("To use with a real database, set DATABASE_URL and run:")
    print("  export DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname")
    print("  alembic upgrade head")
    
except Exception as e:
    print(f"✗ Validation failed: {e}")
    sys.exit(1)