from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'gm-auto-mecanica-secret')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL', 'sqlite:///gm_auto_mecanica.db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    @app.context_processor
    def inject_now():
        return {'now': datetime.utcnow()}

    from app.routes.clientes import clientes_bp
    from app.routes.veiculos import veiculos_bp
    from app.routes.ordens import ordens_bp
    from app.routes.pecas import pecas_bp
    from app.routes.main import main_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(clientes_bp, url_prefix='/clientes')
    app.register_blueprint(veiculos_bp, url_prefix='/veiculos')
    app.register_blueprint(ordens_bp, url_prefix='/ordens')
    app.register_blueprint(pecas_bp, url_prefix='/pecas')

    with app.app_context():
        db.create_all()

    return app
