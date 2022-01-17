var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const passport=require('passport')
const indexRouter = require('./src/api/routes/index');
const usersRouter = require('./src/api/routes/users');
const {db}=require('./src/api/Controllers/config/env')
const app = express();
const fileUpload=require('express-fileupload')
const mongoose = require("mongoose");
mongoose.connect(db,{useNewUrlParser: true, useUnifiedTopology: true})
    .then(()=>{
        console.log("connected to db");
    })
    .catch((e)=>{
        console.log("not connected",e);
    });
app.use(logger('dev'));
app.use(express.json());
app.use(fileUpload({
    useTempFiles:true
}))
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/', indexRouter);
app.use('/users', usersRouter);

const port=3010;
app.listen(port,()=>{
  console.log(`listening at ${port}`);
})