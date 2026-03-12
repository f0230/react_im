const KIE_UPLOAD_BASE_URL = "https://kieai.redpandaai.co";

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    try {
        const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        const { imageDataUrl } = body ?? {};

        if (!imageDataUrl || typeof imageDataUrl !== "string") {
            return res.status(400).json({ error: "Missing imageDataUrl in request body." });
        }

        const apiKey = process.env.KIE_API_KEY || process.env.VITE_KIE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "KIE_API_KEY not configured on server." });
        }

        const imageResponse = await fetch(imageDataUrl);
        if (!imageResponse.ok) {
            throw new Error(`Could not parse reference image: HTTP ${imageResponse.status}`);
        }

        const blob = await imageResponse.blob();
        const extension = getFileExtensionFromType(blob.type);
        const fileName = `reference-${Date.now()}.${extension}`;
        const formData = new FormData();

        formData.append("file", blob, fileName);
        formData.append("uploadPath", "images/banana-reference");
        formData.append("fileName", fileName);

        const uploadResponse = await fetch(`${KIE_UPLOAD_BASE_URL}/api/file-stream-upload`, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
        });

        const data = await parseJsonResponse(uploadResponse);
        if (data.code !== 200) {
            throw new Error(data.msg || `Reference image upload failed (${uploadResponse.status})`);
        }

        const fileUrl =
            data.data?.fileUrl ||
            data.data?.downloadUrl ||
            data.fileUrl ||
            data.downloadUrl ||
            data.data;

        if (typeof fileUrl !== "string") {
            throw new Error("Could not find file URL in upload response");
        }

        return res.status(200).json({ fileUrl });
    } catch (error) {
        console.error("[kie-upload] Error:", error);
        return res.status(500).json({ error: error.message || "Reference image upload failed" });
    }
}

async function parseJsonResponse(response) {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`Unexpected upload response (${response.status}): ${text.slice(0, 120)}`);
    }
}

function getFileExtensionFromType(contentType) {
    if (contentType === "image/jpeg") return "jpg";
    if (contentType === "image/webp") return "webp";
    if (contentType === "image/gif") return "gif";
    return "png";
}
