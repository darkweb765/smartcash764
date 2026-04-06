import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, X, Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const ReportIssue = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let imageUrl: string | null = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("support-images")
          .upload(filePath, imageFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("support-images")
            .getPublicUrl(filePath);
          imageUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        message: message.trim(),
        image_url: imageUrl,
      });

      if (!error) {
        setShowSuccess(true);
        setMessage("");
        setImageFile(null);
        setImagePreview(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted max-w-md mx-auto flex flex-col">
      <div className="bg-green-primary text-white px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-lg font-semibold flex-1 text-center pr-6">Report Issue</span>
        </div>
        <p className="text-white/80 text-sm mt-1">
          Describe your problem below and we'll get back to you as soon as possible.
        </p>
      </div>

      <div className="px-4 mt-6 flex-1 flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Describe your issue <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what went wrong..."
            className="w-full min-h-[150px] rounded-xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-primary/50 resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Attach a screenshot (optional)
          </label>
          {imagePreview ? (
            <div className="relative w-full rounded-xl overflow-hidden border border-border">
              <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
              <button
                onClick={removeImage}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-border rounded-xl bg-card cursor-pointer hover:bg-accent/30 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tap to upload image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!message.trim() || submitting}
          className="w-full flex items-center justify-center gap-2 py-4 bg-green-primary rounded-xl text-white font-semibold text-base disabled:opacity-50 mt-auto mb-6"
        >
          <Send className="w-5 h-5" />
          {submitting ? "Submitting..." : "Submit Report"}
        </button>
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-xs mx-auto rounded-2xl text-center p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Report Submitted!</h3>
            <p className="text-sm text-muted-foreground">
              Your issue has been received. Our support team will review it and get back to you shortly.
            </p>
            <button
              onClick={() => { setShowSuccess(false); navigate(-1); }}
              className="w-full py-3 bg-green-primary rounded-xl text-white font-semibold mt-2"
            >
              OK
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReportIssue;
