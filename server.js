const mongoose = require('mongoose');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log(`Broblem Name : ${err}`);
  console.log('UNCAUGHT EXCEPTION 💥! SHUTTING DOWN...');
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

const LocalDB = process.env.DATABASE_LOCAL;

mongoose
  .connect(LocalDB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then((con) => console.log('DB connection successful!'));

const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log(`Broblem Name : ${err}`);
  console.log('UNHANDLED REJECTION 💥! SHUTTING DOWN...');
  server.close(() => {
    process.exit(1);
  });
});
