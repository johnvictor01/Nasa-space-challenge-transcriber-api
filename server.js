import express from "express";
import fs from "fs";
import path from "path";
import Groq from "groq-sdk";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import "dotenv/config";

// --- Validação da Chave de API ---
const GROQ_KEY = process.env.GROQ_KEY;

// Verificação crucial: se a chave não estiver definida no ambiente, a aplicação não deve iniciar.
if (!GROQ_KEY) {
    console.error(
        "GROQ_KEY ausente. Defina a variável de ambiente GROQ_KEY com sua chave da Groq no painel do Railway."
    );
    process.exit(1); // Encerra a aplicação se a chave não for encontrada
}

const app = express();
app.use(express.json({ limit: "100mb" }));

const groq = new Groq({ apiKey: GROQ_KEY });
ffmpeg.setFfmpegPath(ffmpegStatic);

// --- [NOVO] Endpoint de Health Check ---
// Use este endpoint para verificar se a API está no ar.
// Basta acessar a URL principal (ex: https://...up.railway.app/) no navegador.
app.get("/", (req, res) => {
    res.status(200).json({ 
        status: "online", 
        message: "API de transcrição está no ar.",
        timestamp: new Date().toISOString() 
    });
});


// --- Endpoint de Transcrição ---
app.post("/transcribe", async (req, res) => {
    try {
        const { audioBase64 } = req.body;

        if (!audioBase64) {
            return res
                .status(400)
                .json({ sucesso: false, erro: "Parâmetro 'audioBase64' ausente" });
        }

        const tempDir = "uploads";
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempFilePath = path.join(tempDir, `audio_${Date.now()}.input`);
        const tempMp3Path = tempFilePath + ".converted.mp3";

        const base64Data = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
        fs.writeFileSync(tempFilePath, Buffer.from(base64Data, "base64"));

        await new Promise((resolve, reject) => {
            ffmpeg(tempFilePath)
                .toFormat("mp3")
                .on("error", (err) => {
                    console.error("Erro na conversão ffmpeg:", err.message);
                    reject(err);
                })
                .on("end", () => resolve())
                .save(tempMp3Path);
        });

        const response = await groq.audio.transcriptions.create({
            file: fs.createReadStream(tempMp3Path),
            model: "whisper-large-v3",
        });

        try {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
        } catch (e) {
            console.warn("Não foi possível remover arquivo temporário:", e.message);
        }

        res.json({
            sucesso: true,
            texto: response.text,
        });

    } catch (err) {
        console.error("Erro no endpoint /transcribe:", err);
        const status = err?.status || 500;
        const message = err.message || "Ocorreu um erro interno no servidor.";
        res.status(status).json({ sucesso: false, erro: message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
    console.log(`Servidor rodando na porta ${PORT}`)
);

