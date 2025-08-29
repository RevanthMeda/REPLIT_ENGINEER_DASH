
from models import User

def test_register_and_login(client, app):
    # Register a new user
    response = client.post('/auth/register', data={
        'full_name': 'Test User',
        'email': 'test@example.com',
        'password': 'password',
        'requested_role': 'Engineer'
    }, follow_redirects=True)
    assert response.status_code == 200

    with app.app_context():
        user = User.query.filter_by(email='test@example.com').first()
        assert user is not None
        user.status = 'Active'

    # Login with the new user
    response = client.post('/auth/login', data={
        'email': 'test@example.com',
        'password': 'password'
    }, follow_redirects=True)
    assert response.status_code == 200
