const path = require('path');
const express = require('express');
const morgan = require('morgan');
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//*)GLOBAL Midllewares
//Set Secure HTTP Headers

//Serving Static Files
app.use(express.static(path.join(__dirname, 'public')));

app.use(helmet({ contentSecurityPolicy: false }));

// Development Login
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//Limit Requests From Same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'TooMany Requests From This Ip, Please Try Again In An Hour!',
});
app.use('/api', limiter);

//Body Parser, Reading Data From Body Into Req.Body
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

//Data Sanitization Agains NoSql Query Injection
app.use(mongoSanitize());

//Data Sanitization Against XSS
app.use(xss());

//Prevent Parameter Ploution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratinQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

//Test Middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});

// 2)Routes

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

app.use('*', (req, res, next) => {
  next(new AppError(`Cant Find ${req.originalUrl} On This Server!`, 404));
});

app.use(globalErrorHandler);
module.exports = app;
