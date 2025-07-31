from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import logging

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    # Configure CORS properly
    CORS(app, origins=["http://localhost:3000", "http://localhost:3001"])
    
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    db.init_app(app)
    
    # Global error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "Internal server error"}), 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        app.logger.error(f"Unhandled exception: {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500
    
    from .views import main
    app.register_blueprint(main)
    
    return app