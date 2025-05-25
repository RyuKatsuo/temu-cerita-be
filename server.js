const Hapi = require('@hapi/hapi');
const userRoutes = require('./routes/users');
const sequelize = require('./models/index');
require('dotenv').config();


const init = async () => {
  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST
  });

  server.route(userRoutes);

  // Sync DB
  await sequelize.sync(); 

  await server.start();
  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();