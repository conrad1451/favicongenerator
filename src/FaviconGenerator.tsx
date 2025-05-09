import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Circle, DownloadCloud, Palette, Type, XCircle } from "lucide-react";

// ===============================
// Constants & Types
// ===============================

interface FaviconGenerationResult {
  icoUrl: string | null;
  pngUrl: string | null;
  svgUrl: string | null;
  error: string | null;
}

// ===============================
// Helper Functions
// ===============================

/**
 * Creates a simple image data URL with text on a solid background.
 * @param text - The text to draw on the image.
 * @param color - The background color of the image.
 * @param textColor - The color of the text.
 * @returns A data URL representing the image.
 */
const createImageDataUrl = (
  text: string,
  color: string,
  textColor: string
): string => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return ""; // Return empty string in case the context is not supported.  Handle this error.
  }
  canvas.width = 32;
  canvas.height = 32;

  // Background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Text
  ctx.font = "bold 20px sans-serif"; // Make font size smaller.
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL();
};

/**
 * Converts a data URL to a Blob.
 * @param dataURL - The data URL to convert.
 * @returns A Blob representing the data.
 */
const dataURLToBlob = (dataURL: string): Blob | null => {
  const parts = dataURL.split(";");
  const contentType = parts[0].split(":")[1];
  const raw = window.atob(parts[1].split(",")[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
};

/**
 * Generates favicon files (ICO, PNG, SVG) from a text and color.
 * @param text - The text to use in the favicon.
 * @param color - The background color of the favicon.
 * @param textColor - The color of the text.
 * @returns An object containing URLs for the generated files.
 */
const generateFavicons = async (
  text: string,
  color: string,
  textColor: string
): Promise<FaviconGenerationResult> => {
  try {
    const imageDataURL = createImageDataUrl(text, color, textColor);
    if (!imageDataURL) {
      return {
        icoUrl: null,
        pngUrl: null,
        svgUrl: null,
        error: "Failed to create image data URL.",
      };
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return {
        icoUrl: null,
        pngUrl: null,
        svgUrl: null,
        error: "Could not get canvas context",
      };
    }
    canvas.width = 32;
    canvas.height = 32;
    const img = new Image();

    // Wrap the onload in a promise
    const loadImage = (url: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err); // reject on error.
        img.src = url;
      });
    };

    await loadImage(imageDataURL); // Await the promise

    ctx.drawImage(img, 0, 0);

    // PNG (32x32)
    const pngDataURL = canvas.toDataURL("image/png");
    const pngBlob = dataURLToBlob(pngDataURL);
    const pngUrl = pngBlob ? URL.createObjectURL(pngBlob) : null;

    // SVG (Scalable, text-based) - Improved SVG generation
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
            <style>
                /* Style for the background and text */
                .bg { fill: ${color}; }
                .text {
                    fill: ${textColor};
                    font-family: sans-serif;
                    font-size: 20px; /* Adjust font size as needed */
                    font-weight: bold;
                    text-anchor: middle;
                    dominant-baseline: middle;
                }
            </style>
            <rect class="bg" width="32" height="32" rx="0"/>
            <text class="text" x="16" y="16">${text}</text>
        </svg>`;
    const svgBlob = new Blob([svgContent], { type: "image/svg+xml" });
    const svgUrl = URL.createObjectURL(svgBlob);

    // ICO (Favicon) - still uses canvas
    canvas.width = 32;
    canvas.height = 32;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 32, 32);
    ctx.font = "bold 20px sans-serif"; // Make font size smaller.
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 16, 16);

    // Create ICO data.  Simplified, uses a library for actual ICO conversion.
    const icoDataURL = canvas.toDataURL("image/png"); // Use PNG as intermediate.
    const icoBlob = await convertPNGToICO(icoDataURL); // Use the function.

    const icoUrl = icoBlob ? URL.createObjectURL(icoBlob) : null;

    return { icoUrl, pngUrl, svgUrl, error: null };
  } catch (error: any) {
    return {
      icoUrl: null,
      pngUrl: null,
      svgUrl: null,
      error: error.message || "An error occurred",
    };
  }
};

// Mock convertPNGToICO function (replace with actual library in a real app)
const convertPNGToICO = async (pngDataURL: string): Promise<Blob | null> => {
  // In a real application, you would use a library like 'icotool' or a server-side
  // endpoint to convert the PNG to ICO format.  This is a simplified mock.

  const response = await fetch(pngDataURL);
  const pngBlob = await response.blob();
  return pngBlob;
};

// ===============================
// React Component
// ===============================

const FaviconGeneratorApp = () => {
  // ===============================
  // State
  // ===============================

  const [text, setText] = useState("F");
  const [color, setColor] = useState("#4F46E5"); // Default: Indigo
  const [textColor, setTextColor] = useState("#FFFFFF"); // Default: White
  const [faviconUrls, setFaviconUrls] = useState<FaviconGenerationResult>({
    icoUrl: null,
    pngUrl: null,
    svgUrl: null,
    error: null,
  });
  const [loading, setLoading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<
    "color" | "textColor" | null
  >(null);

  // ===============================
  // Refs
  // ===============================
  const colorInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const textColorInputRef = useRef<HTMLInputElement>(null);

  // ===============================
  // Effects
  // ===============================

  useEffect(() => {
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  }, []);

  // ===============================
  // Handlers
  // ===============================
  const handleGenerateFavicon = useCallback(async () => {
    setLoading(true);
    setFaviconUrls({ icoUrl: null, pngUrl: null, svgUrl: null, error: null }); // Clear previous results.
    try {
      const results = await generateFavicons(text, color, textColor);
      setFaviconUrls(results);
    } catch (error: any) {
      setFaviconUrls({
        icoUrl: null,
        pngUrl: null,
        svgUrl: null,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [text, color, textColor]);

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value.substring(0, 2)); // Limit to 2 characters.
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setColor(event.target.value);
  };

  const handleTextColorChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setTextColor(event.target.value);
  };

  const handleDownload = (url: string | null, filename: string) => {
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the URL object.
  };

  const toggleColorPicker = (type: "color" | "textColor") => {
    setShowColorPicker((prev) => (prev === type ? null : type));
  };

  const closeColorPicker = () => {
    setShowColorPicker(null);
  };

  const handleColorSelect = (newColor: string) => {
    if (showColorPicker === "color") {
      setColor(newColor);
      if (colorInputRef.current) {
        colorInputRef.current.value = newColor;
      }
    } else if (showColorPicker === "textColor") {
      setTextColor(newColor);
      if (textColorInputRef.current) {
        textColorInputRef.current.value = newColor;
      }
    }
    closeColorPicker();
  };

  // ===============================
  // Render
  // ===============================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center bg-gradient-to-r from-indigo-400 to-purple-500 text-transparent bg-clip-text">
          Favicon Generator
        </h1>

        {/* Input Section */}
        <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6 border border-gray-800 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Text Input */}
            <div>
              <Label
                htmlFor="text"
                className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2"
              >
                Text (1-2 characters)
              </Label>
              <div className="relative">
                <Input
                  ref={textInputRef}
                  id="text"
                  type="text"
                  value={text}
                  onChange={handleTextChange}
                  placeholder="F"
                  maxLength={2}
                  className="w-full text-center bg-black/50 text-white border-gray-700 placeholder:text-gray-400"
                />
                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              </div>
            </div>

            {/* Color Input */}
            <div>
              <Label
                htmlFor="color"
                className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2"
              >
                Background Color
              </Label>
              <div className="relative flex items-center">
                <Input
                  ref={colorInputRef}
                  id="color"
                  type="text"
                  value={color}
                  onChange={handleColorChange}
                  className="w-full bg-black/50 text-white border-gray-700 pr-10"
                  placeholder="#4F46E5"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleColorPicker("color")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  title="Choose Color"
                >
                  <Palette className="w-4 h-4" />
                </Button>
                <div
                  className="absolute right-12 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-gray-700"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>

            {/* Text Color Input */}
            <div>
              <Label
                htmlFor="textColor"
                className="block text-sm font-medium text-gray-300 mb-1 sm:mb-2"
              >
                Text Color
              </Label>
              <div className="relative flex items-center">
                <Input
                  ref={textColorInputRef}
                  id="textColor"
                  type="text"
                  value={textColor}
                  onChange={handleTextColorChange}
                  className="w-full bg-black/50 text-white border-gray-700 pr-10"
                  placeholder="#FFFFFF"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleColorPicker("textColor")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  title="Choose Text Color"
                >
                  <Palette className="w-4 h-4" />
                </Button>
                <div
                  className="absolute right-12 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-gray-700"
                  style={{ backgroundColor: textColor }}
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerateFavicon}
            disabled={loading}
            className={cn(
              "w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2.5 px-6 rounded-lg transition-colors duration-300",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading ? (
              <>Generating...</>
            ) : (
              <>
                <Circle className="mr-2 w-4 h-4" />
                Generate Favicons
              </>
            )}
          </Button>
        </div>

        {/* Output Section */}
        {(faviconUrls.icoUrl ||
          faviconUrls.pngUrl ||
          faviconUrls.svgUrl ||
          faviconUrls.error) && (
          <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6 border border-gray-800 shadow-lg">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-200">
              Results
            </h2>
            {faviconUrls.error ? (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md flex items-center">
                <XCircle className="mr-2 w-5 h-5" />
                {faviconUrls.error}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {/* ICO Output */}
                {faviconUrls.icoUrl && (
                  <div className="space-y-2">
                    <div className="w-16 h-16 bg-gray-800 rounded-md flex items-center justify-center border border-gray-700">
                      <img
                        src={faviconUrls.icoUrl}
                        alt="Favicon (ICO)"
                        className="w-8 h-8"
                      />
                    </div>
                    <p className="text-sm text-gray-400">Favicon (ICO)</p>
                    <Button
                      onClick={() =>
                        handleDownload(faviconUrls.icoUrl, "favicon.ico")
                      }
                      className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 transition-colors duration-200 w-full"
                      variant="outline"
                    >
                      <DownloadCloud className="mr-2 w-4 h-4" />
                      Download ICO
                    </Button>
                  </div>
                )}

                {/* PNG Output */}
                {faviconUrls.pngUrl && (
                  <div className="space-y-2">
                    <div className="w-16 h-16 bg-gray-800 rounded-md flex items-center justify-center border border-gray-700">
                      <img
                        src={faviconUrls.pngUrl}
                        alt="Favicon (PNG)"
                        className="w-8 h-8"
                      />
                    </div>
                    <p className="text-sm text-gray-400">Favicon (PNG)</p>
                    <Button
                      onClick={() =>
                        handleDownload(faviconUrls.pngUrl, "favicon.png")
                      }
                      className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 transition-colors duration-200 w-full"
                      variant="outline"
                    >
                      <DownloadCloud className="mr-2 w-4 h-4" />
                      Download PNG
                    </Button>
                  </div>
                )}

                {/* SVG Output */}
                {faviconUrls.svgUrl && (
                  <div className="space-y-2">
                    <div className="w-16 h-16 bg-gray-800 rounded-md flex items-center justify-center border border-gray-700">
                      {/* Display the SVG directly, or use an img tag.  */}
                      <img
                        src={faviconUrls.svgUrl}
                        alt="Favicon (SVG)"
                        className="w-8 h-8"
                      />
                    </div>
                    <p className="text-sm text-gray-400">Favicon (SVG)</p>
                    <Button
                      onClick={() =>
                        handleDownload(faviconUrls.svgUrl, "favicon.svg")
                      }
                      className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 transition-colors duration-200 w-full"
                      variant="outline"
                    >
                      <DownloadCloud className="mr-2 w-4 h-4" />
                      Download SVG
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* Color Picker (Popup) */}
      {showColorPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-xl p-4 shadow-2xl border border-gray-700 max-w-[90%] w-[300px]">
            <h2 className="text-lg font-semibold mb-4 text-gray-200">
              Choose {showColorPicker === "color" ? "Background" : "Text"} Color
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {/* Basic Color Palette */}
              {[
                "#FFFFFF",
                "#000000",
                "#1F2937",
                "#374151",
                "#4B5563",
                "#6B7280",
                "#9CA3AF",
                "#D1D5DB",
                "#E5E7EB",
                "#F3F4F6",
                "#EF4444",
                "#F97316",
                "#F59E0B",
                "#EAB308",
                "#84CC16",
                "#22C55E",
                "#10B981",
                "#06B68A",
                "#0891B2",
                "#0E7490",
                "#3B82F6",
                "#6366F1",
                "#8B5CF6",
                "#A855F7",
                "#D946EF",
                "#EC4899",
                "#F43F5E",
                "#FB7185",
              ].map((c) => (
                <button
                  key={c}
                  onClick={() => handleColorSelect(c)}
                  className={cn(
                    "w-8 h-8 rounded-full",
                    "transition-all duration-200",
                    "border border-gray-700",
                    "hover:ring-2 hover:ring-offset-1",
                    `hover:ring-${
                      c === "#FFFFFF" || c === "#F3F4F6"
                        ? "gray"
                        : c === "#000000" || c === "#1F2937"
                        ? "gray"
                        : c === "#EF4444"
                        ? "red"
                        : c === "#F97316"
                        ? "orange"
                        : c === "#F59E0B"
                        ? "amber"
                        : c === "#EAB308"
                        ? "yellow"
                        : c === "#84CC16"
                        ? "lime"
                        : c === "#22C55E"
                        ? "green"
                        : c === "#10B981"
                        ? "emerald"
                        : c === "#06B68A"
                        ? "teal"
                        : c === "#0891B2"
                        ? "cyan"
                        : c === "#0E7490"
                        ? "sky"
                        : c === "#3B82F6"
                        ? "blue"
                        : c === "#6366F1"
                        ? "indigo"
                        : c === "#8B5CF6"
                        ? "violet"
                        : c === "#A855F7"
                        ? "purple"
                        : c === "#D946EF"
                        ? "fuchsia"
                        : c === "#EC4899"
                        ? "pink"
                        : "rose"
                    }-500`,

                    c === "#FFFFFF"
                      ? "ring-gray-500"
                      : c === "#000000"
                      ? "ring-gray-500"
                      : ""
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={closeColorPicker}
                className="text-gray-300 hover:text-white hover:bg-gray-700 border-gray-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FaviconGeneratorApp;
