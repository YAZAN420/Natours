const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const apiFeatures = require('./../utils/apiFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No Document Found With That ID', 404));
    }

    res.status(204).json({
      requestTime: req.requestTime,
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document Found With That ID', 404));
    }

    res.status(200).json({
      requestTime: req.requestTime,
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);

    const doc = await query;

    if (!doc) {
      return next(new AppError('No document Found With That ID', 404));
    }

    res.status(200).json({
      requestTime: req.requestTime,
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    let fillter = {};
    if (req.params.tourId) fillter = { tour: req.params.tourId };
    const features = new apiFeatures(Model.find(fillter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const doc = await features.query;

    res.status(200).json({
      requestTime: req.requestTime,
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
