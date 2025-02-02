const user = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images', 400), false);
  }
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

const filterOBJ = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.getAllUsers = factory.getAll(user);
exports.getUser = factory.getOne(user);
exports.deleteUser = factory.deleteOne(user);
exports.editUser = factory.updateOne(user);

exports.creatUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! please use /signup instead',
  });
};

exports.updateMe = catchAsync(async (req, res, next) => {
  console.log(req.file);
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates, Please use /updateMyPassword.',
        401
      )
    );
  }

  const filteredBody = filterOBJ(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  const updatedUser = await user.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await user.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null,
  });
});
