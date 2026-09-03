const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (fileBuffer, folderName) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderName,
        width: 300,
        height: 300,
        crop: "fill",
        gravity: "face",
        format: "webp",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result.secure_url);
      }
    );

    uploadStream.on("error", reject);
    uploadStream.end(fileBuffer);
  });
};

cloudinary.uploadToCloudinary = uploadToCloudinary;

module.exports = cloudinary;

