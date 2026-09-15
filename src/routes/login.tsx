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

function arabicAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "البريد أو كلمة المرور غير صحيحة";
  if (m.includes("email not confirmed")) return "البريد غير مؤكد بعد. راجع صندوق الوارد أو عطّل تأكيد البريد في سوبربيس";
  if (m.includes("user already registered")) return "هذا البريد مفعّل مسبقاً. استخدم دخول";
  if (m.includes("signup is disabled")) return "التسجيل مغلق. اطلب من المسؤول تفعيل حسابك";
  return message;
}

function LoginPage() {
  const nav = useNavigate();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"in" | "activate">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const mail = email.trim().toLowerCase();
    if (!mail || password.length < 6) {
      toast.error("أدخل البريد الذي سجّله المسؤول، وكلمة مرور من 6 أحرف على الأقل");
      return;
    }
    setPending(true);
    try {
      if (mode === "activate") {
        const allowed = await supabase.rpc("can_activate_account" as never, { p_email: mail } as never);
        if (allowed.error) throw new Error(allowed.error.message);
        if (!allowed.data) {
          toast.error("هذا البريد غير مسجّل في المنظومة. اطلب من المسؤول حفظه في بطاقتك أولاً");
          return;
        }
        const { error: upError } = await supabase.auth.signUp({ email: mail, password });
        if (upError) throw upError;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
      if (error) throw error;
      await refresh();
      await nav({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? arabicAuthError(e.message) : "تعذّر الدخول");
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
              {mode === "in"
                ? "دخول حقيقي بالبريد وكلمة المرور"
                : "أول مرة فقط: فعّل حسابك بنفس البريد المسجّل لك"}
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          <div>
            <Label>البريد المسجّل في بطاقتك</Label>
            <Input
              dir="ltr"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <Label>{mode === "in" ? "كلمة المرور" : "اختر كلمة مرور"}</Label>
            <Input
              dir="ltr"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>
          <Button disabled={pending} onClick={() => void submit()}>
            {mode === "in" ? "دخول" : "تفعيل الحساب ودخول"}
          </Button>
        </div>
        <button
          type="button"
          className="w-full text-center text-sm font-semibold text-primary"
          onClick={() => setMode(mode === "in" ? "activate" : "in")}
        >
          {mode === "in" ? "أول مرة؟ تفعيل الحساب" : "لدي حساب، أريد الدخول"}
        </button>
      </div>
    </div>
  );
}
