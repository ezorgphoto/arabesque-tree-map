import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [{ title: "دخول | نظام الإدارة التنفيذية" }],
  }),
});

function LoginPage() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const mail = email.trim().toLowerCase();
    if (!mail || password.length < 6) {
      toast.error("أدخل بريداً صحيحاً وكلمة مرور من 6 أحرف على الأقل");
      return;
    }
    setPending(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({ email: mail, password });
        if (error) throw error;
        toast.success("تم إنشاء الحساب. إن لم يفتح تلقائياً سجّل الدخول.");
      }
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (error) throw error;
      await refresh();
      await nav({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر الدخول");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="panel w-full max-w-md space-y-6 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold">نظام الإدارة التنفيذية</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "in" ? "سجّل الدخول بحسابك" : "أنشئ حساباً بالبريد الذي سجّله المسؤول"}
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          <div>
            <Label>البريد</Label>
            <Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>كلمة المرور</Label>
            <Input
              dir="ltr"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          <Button disabled={pending} onClick={submit}>
            {mode === "in" ? "دخول" : "إنشاء حساب ودخول"}
          </Button>
        </div>
        <button
          type="button"
          className="w-full text-center text-sm font-semibold text-primary"
          onClick={() => setMode(mode === "in" ? "up" : "in")}
        >
          {mode === "in" ? "ليس لديك حساب؟ إنشاء حساب" : "لديك حساب؟ تسجيل الدخول"}
        </button>
      </div>
    </div>
  );
}
