const mongoose=require('mongoose');
const {ObjectId}=mongoose.Schema.Types
const userschema=mongoose.Schema({
    username:{
        type:String,
        required:true,
        unique: true
    },
    email:{
        type: String,
        required: true,
        match: /.+\@.+\..+/,
        unique: true
    },
    password:{
        type:String,
        required:true,
        minLength: 6,
        maxLength: 300
    },
    email_verified:{
      type:Boolean,
        default: 0
    },
    hash:{
        type:String,
        required:true,
    },
    created_at: {
        type: Date,
        required: true,
        default: Date.now
    },
    updated_at: {
        type: Date,
        required: true,
        default: Date.now
    },
    profile_pic_url:{
        type:String,
        required:false,
        default:null,
    },
    followers:[{
        type:ObjectId,
        ref:"User",
    }],
    following:[{
        type:ObjectId,
        ref:"User"
    }],
    approve:[{
        type:ObjectId,
        ref:"User",
    }],
    blocked: { type: [ObjectId], default: [], ref: 'User' },

});

module.exports=mongoose.model("User",userschema);