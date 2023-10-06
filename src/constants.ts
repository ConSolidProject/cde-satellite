import multer from 'multer';


const extractFile = multer({
    limits: { fieldSize: 500 * 1024 * 1024 },
});

export { extractFile };