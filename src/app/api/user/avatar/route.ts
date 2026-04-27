import { withSession } from "@/lib/api/withSession";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const POST = withSession(async (req, userId) => {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE_BYTES) {
    return Response.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "Unsupported file type. Use JPG, PNG, WebP, or GIF." }, { status: 400 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");

  const supabase = getSupabaseAdminClient();

  // Ensure bucket exists (no-op if already present)
  await supabase.storage.createBucket("avatars", { public: true }).catch(() => {});

  const path = `${userId}/avatar.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (uploadError) return Response.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

  // Persist to profile
  await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);

  return Response.json({ url: publicUrl });
});
