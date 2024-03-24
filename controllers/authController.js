const user = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const { promisify } = require('util');
const Email = require('./../utils/email');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await user.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });
  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  //2)Check is user exists && password is correct
  const User = await user.findOne({ email }).select('+password');
  if (!User || !(await User.correctPassword(password, User.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //3)If everything ok, send token to client
  createSendToken(User, 200, res);
});
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};
exports.protect = catchAsync(async (req, res, next) => {
  //1)Getting token and check if its there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access', 401)
    );
  }
  //2)Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3)Check if user still exists
  const currentUser = await user.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token does no longer exist', 401)
    );
  }
  //4)Check if user Changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401)
    );
  }
  // Grant Access To Protected Route
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //1)Verification token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );
      //2)Check if user still exists
      const currentUser = await user.findById(decoded.id);
      if (!currentUser) {
        return next();
      }
      //3)Check if user Changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }
      // Grant Access To Protected Route
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
exports.restrictTo = (...role) => {
  return (req, res, next) => {
    if (!role.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perfrom this action', 403)
      );
    }
    next();
  };
};
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)Get User Based On Posted Email
  const User = await user.findOne({ email: req.body.email });
  if (!User) {
    return next(new AppError('There is no user with email address', 404));
  }
  //2)Generate The Random Reset Token
  const resetToken = User.createPasswordResetToken();
  await User.save({ validateBeforeSave: false });
  //3)Send It To User Email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot you password? Submit a PATCH request with you new password and passwordConfirm to: ${resetURL}.\nIf you didnt forget your password, please ignore this email! `;
  try {
    await new Email(User, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token send to email!',
    });
  } catch (err) {
    User.passwordResetToken = undefined;
    User.passwordResetExpires = undefined;
    await User.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email, Try again later!',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get User Based On The Token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const User = await user.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  //2)If Token Has Not Expired, And There Is User, Set The New Password
  if (!User) {
    return next(new AppError('Token is invalid or has been expired', 400));
  }
  User.password = req.body.password;
  User.passwordConfirm = req.body.passwordConfirm;
  User.passwordResetToken = undefined;
  User.passwordResetExpires = undefined;
  await User.save();
  //3)Update ChangedPasswordAt Property For The User
  //4)Log The User In, Send JWT
  createSendToken(User, 200, res);
});
exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get User From Collection
  const User = await user.findById(req.user.id).select('+password');
  //2)Check If Posted Current Password Is Correct
  if (!(await User.correctPassword(req.body.passwordCurrent, User.password))) {
    return next(new AppError('Your Current Password Is Wrong', 401));
  }
  //3)If So, Update Password
  User.password = req.body.password;
  User.passwordConfirm = req.body.passwordConfirm;
  User.passwordResetExpires = undefined;
  User.passwordResetToken = undefined;
  await User.save();
  //4)Log User In, Send JWT
  createSendToken(User, 200, res);
});
