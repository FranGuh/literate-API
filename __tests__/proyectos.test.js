// __tests__/proyectos.test.js
const request = require('supertest');
const app = require('../app');
const db = require('../config/db');

afterAll(async () => {
    await db.pool.end();
});

describe('Endpoints de Proyectos', () => {
    let token;
    let proyectoCreado;

    beforeAll(async () => {
        await db.query('DELETE FROM proyectos_tecnologias');
        await db.query('DELETE FROM imagenes');
        await db.query('DELETE FROM audit_log');
        await db.query('DELETE FROM proyectos');
        await db.query('DELETE FROM usuarios');
        await db.query('DELETE FROM tecnologias');

    
        const testUser = {
            nombre: 'Test User',
            email: `test${Date.now()}@test.com`,
            password: 'password123'
        };
        await request(app).post('/api/auth/register').send(testUser);
        const loginRes = await request(app).post('/api/auth/login').send({ email: testUser.email, password: testUser.password });
        token = loginRes.body.token;
    });

    beforeEach(async () => {
        await db.query('DELETE FROM proyectos_tecnologias');
        await db.query('DELETE FROM proyectos');
        await db.query('DELETE FROM tecnologias');

        const proyectoRes = await request(app)
            .post('/api/proyectos')
            .set('Authorization', `Bearer ${token}`)
            .send({ titulo: 'Proyecto Base', cuerpo: 'Cuerpo base' });
        proyectoCreado = proyectoRes.body.data;
    });

    it('GET /api/proyectos | debería obtener una lista con un proyecto', async () => {
        const res = await request(app).get('/api/proyectos');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(1); 
        expect(res.body[0].titulo).toBe('Proyecto Base');
    });

    it('POST /api/proyectos | debería crear un segundo proyecto', async () => {
        const res = await request(app)
            .post('/api/proyectos')
            .set('Authorization', `Bearer ${token}`)
            .send({ titulo: 'Otro Proyecto de Test', cuerpo: 'Descripción de prueba' });

        expect(res.statusCode).toEqual(201);
        expect(res.body.data.titulo).toBe('Otro Proyecto de Test');
    });

    it('PATCH /api/proyectos/:id | debería actualizar un proyecto existente', async () => {
        const res = await request(app)
            .patch(`/api/proyectos/${proyectoCreado.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ titulo: 'Titulo Actualizado' });

        expect(res.statusCode).toEqual(200);
        expect(res.body.data.titulo).toBe('Titulo Actualizado');
    });

    it('POST /:proyectoId/tecnologias | debería asociar un lote de tecnologías', async () => {
    // 1. Creamos varias tecnologías
    const tec1 = await request(app).post('/api/tecnologias').set('Authorization', `Bearer ${token}`).send({ nombre: 'Node.js' });
    const tec2 = await request(app).post('/api/tecnologias').set('Authorization', `Bearer ${token}`).send({ nombre: 'React' });
    
    const idsAAsociar = [tec1.body.data.id, tec2.body.data.id];

    // 2. Hacemos la petición de lote
    const res = await request(app)
        .post(`/api/proyectos/${proyectoCreado.id}/tecnologias`)
        .set('Authorization', `Bearer ${token}`)
        .send({ tecnologiaIds: idsAAsociar });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body.data.length).toBe(2); // Verificamos que se crearon 2 relaciones
    });

    it('POST /:projectId/tecnologias | debería fallar si un ID de tecnología no existe', async () => {
        const idsInvalidos = [1, 9999]; 

        const res = await request(app)
            .post(`/api/proyectos/${proyectoCreado.id}/tecnologias`)
            .set('Authorization', `Bearer ${token}`)
            .send({ tecnologiaIds: idsInvalidos });

        // Esperamos un error porque uno de los IDs es inválido, probando el ROLLBACK
        expect(res.statusCode).toEqual(404); 
    });

    it('DELETE /api/proyectos/:id | no debería eliminar un proyecto que no le pertenece', async () => {
    // 1. Creamos un SEGUNDO usuario
    const otroUsuario = {
        nombre: 'Otro User',
        email: `otro${Date.now()}@test.com`,
        password: 'password123'
    };
    await request(app).post('/api/auth/register').send(otroUsuario);
    const loginResOtro = await request(app).post('/api/auth/login').send({ email: otroUsuario.email, password: otroUsuario.password });
    const otroToken = loginResOtro.body.token;

    // 2. El usuario B intenta borrar el proyecto del usuario A (creado en beforeEach)
    const res = await request(app)
        .delete(`/api/proyectos/${proyectoCreado.id}`)
        .set('Authorization', `Bearer ${otroToken}`); // <-- Usamos el token del OTRO usuario

    // 3. Esperamos un error 404 (porque tu API dice "Proyecto no encontrado o no tienes permiso")
    expect(res.statusCode).toEqual(404);
    });

    it('DELETE /api/proyectos/:id | debería eliminar un proyecto existente', async () => {
        const deleteRes = await request(app)
            .delete(`/api/proyectos/${proyectoCreado.id}`)
            .set('Authorization', `Bearer ${token}`);
        
        expect(deleteRes.statusCode).toEqual(200);
        
        const getRes = await request(app).get(`/api/proyectos/${proyectoCreado.id}`);
        expect(getRes.statusCode).toEqual(404);
    });
});