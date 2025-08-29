
def test_create_app(app):
    assert app is not None

def test_home_page(client):
    response = client.get('/')
    assert response.status_code == 302
