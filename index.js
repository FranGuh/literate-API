// index.js

const app = require('./app');
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}

const port = process.env.PORT || 4000;

app.listen(port, () => {
    console.log(`Servidor en el puerto ${port}`);
});