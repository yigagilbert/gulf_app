from app.bootstrap import ensure_auth_schema, ensure_default_super_admin
from app.database import Base, engine


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    ensure_auth_schema(engine)
    Base.metadata.create_all(bind=engine)
    ensure_default_super_admin()
