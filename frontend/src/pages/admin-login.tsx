import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// استخدام المتغير الديناميكي لرابط الـ API المتصل بـ Render أو المحلي
const API_URL = process.env.NODE_ENV === "production" 
  ? "https://your-backend-url.onrender.com/api" 
  : "http://localhost:5000/api";

const loginSchema = z.object({
  username: z.string().min(1, "يجب إدخال اسم المستخدم"),
  password: z.string().min(1, "يجب إدخال كلمة المرور"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsPending(true);

    try {
      // الاتصال بمسار الـ Auth الموحد والمحدث في الباك إند
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // 👈 حاسمة جداً عشان المتصفح يستقبل الـ Cookie الخاصة بالـ Session ويحفظها
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: `مرحباً بك مجدداً يا قائد!`,
        });
        
        // التوجيه مباشرة للوحة التحكم - الـ Cookie حتحمي المسارات تلقائياً
        setLocation("/admin/dashboard");
      } else {
        throw new Error(result.error || "اسم المستخدم أو كلمة المرور غير صحيحة");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "فشل تسجيل الدخول",
        description: err.message,
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 space-y-2">
          <div className="w-16 h-16 bg-primary rounded-full mx-auto flex items-center justify-center text-white mb-4">
            <svg viewBox="0 0 100 100" fill="currentColor" className="w-10 h-10">
              <path d="M50 0A50 50 0 1 0 100 50 35 35 0 1 1 50 0Z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم الإدارية</h1>
          <p className="text-muted-foreground text-sm">نظام حصر وتوثيق متطوعي الهلال الأحمر</p>
        </div>

        <div className="bg-card text-card-foreground p-8 rounded-xl shadow-lg border">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المستخدم</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم المستخدم" dir="ltr" className="text-right" data-testid="input-username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="أدخل كلمة المرور" dir="ltr" className="text-right" data-testid="input-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={isPending}
                data-testid="button-login"
              >
                {isPending ? "جاري التحقق والدخول..." : "تسجيل الدخول"}
              </Button>
            </form>
          </Form>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => setLocation("/")}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            العودة للاستمارة الرئيسية
          </button>
        </div>
      </div>
    </div>
  );
}
