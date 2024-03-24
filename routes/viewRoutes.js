const express = require('express');
const viewsContoller = require('../controllers/viewsController');
const authContoller = require('../controllers/authController');
const router = express.Router();

router.get('/', authContoller.isLoggedIn, viewsContoller.getOverview);
router.get('/tour/:slug', authContoller.isLoggedIn, viewsContoller.getTour);
router.get('/login', authContoller.isLoggedIn, viewsContoller.getLoginForm);
router.get('/signup', authContoller.isLoggedIn, viewsContoller.getSignupForm);
router.get('/me', authContoller.protect, viewsContoller.getAccount);
module.exports = router;
