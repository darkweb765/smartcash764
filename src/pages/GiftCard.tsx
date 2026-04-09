import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, Upload, X } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const giftCards = [
  { name: "Apple & iTunes", icon: "🍎" },
  { name: "Google Play", icon: "🎮" },
  { name: "Amazon", icon: "📦" },
  { name: "Steam", icon: "🎯" },
  { name: "PlayStation", icon: "🎮" },
  { name: "Xbox", icon: "🕹️" },
  { name: "Visa", icon: "💳" },
  { name: "eBay", icon: "🛒" },
  { name: "Walmart", icon: "🏪" },
  { name: "Netflix", icon: "🎬" },
  { name: "Spotify", icon: "🎵" },
  { name: "Razer Gold", icon: "⚡" },
];

const denominations = ["$5", "$10", "$15", "$20", "$25", "$50", "$100", "$200", "$500"];

const GiftCard = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedCard, setSelectedCard] = useState(giftCards[0]);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [format, setFormat] = useState<"Physical" | "Ecode">("Physical");
  const [denomination, setDenomination] = useState("");
  const [showDenomPicker, setShowDenomPicker] = useState(false);
  const [cardCode, setCardCode] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setImages((prev) => [...prev, ev.target!.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const handleSell = () => {
    if (!denomination) return;
    if (format === "Ecode" && !cardCode.trim()) return;
    if (format === "Physical" && images.length === 0) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setShowResult(true);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-muted max-w-md mx-auto flex flex-col pb-20">
      {/* Header */}
      <div className="bg-green-primary text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-6 h-6" /></button>
        <span className="text-lg font-semibold">Sell Gift Cards</span>
      </div>

      {/* Card Selector */}
      <div className="mx-4 mt-6 bg-card rounded-2xl border border-border p-5">
        <button
          onClick={() => setShowCardPicker(true)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">{selectedCard.icon}</span>
            <span className="font-semibold text-foreground">{selectedCard.name}</span>
          </div>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Format */}
        <div className="flex items-center mt-5">
          <span className="text-sm text-muted-foreground w-24">Format</span>
          <div className="flex gap-2">
            {(["Physical", "Ecode"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-5 py-2 rounded-lg text-sm font-medium border ${
                  format === f
                    ? "bg-green-primary text-white border-green-primary"
                    : "bg-card text-foreground border-border"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Denomination */}
        <div className="flex items-center mt-4">
          <span className="text-sm text-muted-foreground w-24">Denomination</span>
          <button
            onClick={() => setShowDenomPicker(true)}
            className="flex-1 flex items-center justify-between border border-border rounded-lg px-3 py-2"
          >
            <span className={`text-sm ${denomination ? "text-foreground" : "text-muted-foreground"}`}>
              {denomination || "Select Denomination"}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Amount display */}
        <div className="flex items-center mt-4">
          <span className="text-sm text-muted-foreground w-24">Amount</span>
          <span className="text-sm text-muted-foreground">
            {denomination ? `₦0.00` : "Select denomination first"}
          </span>
        </div>
      </div>

      {/* Trade Terms */}
      <div className="mx-4 mt-4 bg-card rounded-2xl border border-border p-5">
        <p className="text-sm text-orange-600 flex items-center gap-2 mb-4">
          ⓘ Trade Terms: Please keep your card safe!
        </p>

        {format === "Ecode" ? (
          <div>
            <label className="text-sm text-muted-foreground">Card Code / E-code</label>
            <input
              type="text"
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value)}
              placeholder="Enter gift card code"
              className="w-full mt-1 px-3 py-3 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-primary"
            />
          </div>
        ) : (
          <div>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg py-6 flex flex-col items-center gap-2 text-muted-foreground hover:border-green-primary transition-colors"
            >
              <Upload className="w-8 h-8" />
              <span className="text-sm">Click to Upload Image(s)</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            {images.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {images.map((img, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="mx-4 mt-4 bg-card rounded-2xl border border-border p-5 text-center">
        <p className="text-3xl font-bold text-muted-foreground">₦0.00</p>
      </div>

      {/* Sell Button */}
      <div className="mx-4 mt-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-green-primary font-medium">Total Received:</p>
          <p className="text-xl font-bold text-foreground">₦0.00</p>
        </div>
        <button
          onClick={handleSell}
          disabled={processing}
          className="bg-green-primary text-white px-10 py-3 rounded-xl font-semibold text-lg disabled:opacity-50"
        >
          {processing ? "Processing..." : "SELL"}
        </button>
      </div>

      {/* Card Picker */}
      <Dialog open={showCardPicker} onOpenChange={setShowCardPicker}>
        <DialogContent className="max-w-sm mx-auto">
          <h3 className="text-lg font-semibold mb-3">Select Gift Card</h3>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {giftCards.map((card) => (
              <button
                key={card.name}
                onClick={() => { setSelectedCard(card); setShowCardPicker(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
                  selectedCard.name === card.name ? "bg-green-100" : "hover:bg-muted"
                }`}
              >
                <span className="text-2xl">{card.icon}</span>
                <span className="font-medium text-foreground">{card.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Denomination Picker */}
      <Dialog open={showDenomPicker} onOpenChange={setShowDenomPicker}>
        <DialogContent className="max-w-sm mx-auto">
          <h3 className="text-lg font-semibold mb-3">Select Denomination</h3>
          <div className="grid grid-cols-3 gap-2">
            {denominations.map((d) => (
              <button
                key={d}
                onClick={() => { setDenomination(d); setShowDenomPicker(false); }}
                className={`px-4 py-3 rounded-lg text-sm font-medium border ${
                  denomination === d
                    ? "bg-green-primary text-white border-green-primary"
                    : "bg-card text-foreground border-border hover:bg-muted"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invalid Card Result */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-sm mx-auto text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Invalid Gift Card</h3>
            <p className="text-sm text-muted-foreground">
              This gift card could not be verified. The card may be used, expired, or invalid. Please try a different card.
            </p>
            <button
              onClick={() => setShowResult(false)}
              className="mt-2 bg-green-primary text-white px-8 py-3 rounded-xl font-semibold w-full"
            >
              Try Again
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default GiftCard;
