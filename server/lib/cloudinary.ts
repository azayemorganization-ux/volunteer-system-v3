import { v2 as cloudinary } from "cloudinary";

// تهيئة إعدادات الرفع السحابي باستخدام المتغيرات المؤمنة في ملف الـ .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * دالة ذكية لرفع صور المتطوعين والشهادات من السيرفر إلى سحابة Cloudinary
 * @param base64Image النص المشفر الممتد القادم من استمارة المتطوع
 */
export const uploadToCloudinary = async (base64Image: string): Promise<string> => {
  try {
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      folder: "srcs_volunteers_2026", // مجلد منظم وخاص بمتطوعي جبل أولياء لعام 2026
      resource_type: "auto",
    });
    
    return uploadResponse.secure_url; // إرجاع الرابط المؤمن المشفر بـ HTTPS
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error("فشل رفع الصورة إلى السحابة، يرجى التحقق من الاتصال والمفاتيح");
  }
};

export default cloudinary;
