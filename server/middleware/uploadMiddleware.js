import multer from 'multer';
import path from 'path';
import fs from 'fs'; //File systems..lets you read/write files to your computer's hard drive

//Ensure uploads directory exists for development
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, {recursive: true});
}

//Configure Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb){
        // In Development: Saves to the local 'uploads' folder
        cb(null, uploadDir);
    },
    filename: function (req, file, cb){
        // Creates a unique filename: e.g., menu-item-169823902.jpg
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname  + '-' + uniqueSuffix + path.extname(file.originalname));
    }
})

//File Filter (Only accept images)
const fileFilter = (req, file, cb) => {
    if  (file.mimetype.startsWith('image/')){
        cb(null,true);
    } else {
        cb(new Error('Not an image! Please upload only images.'), false);
    }
};

export const upload = multer({
    storage: storage,
    limits: {fileSize: 5 * 1024 * 1024},
    fileFilter: fileFilter
});