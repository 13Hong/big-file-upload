import express from "express"
import cors from "cors"
import uploadRoutes from "./routes/upload.routes"
// import { initStorageDirs } from "./utils/path"

const app = express()

app.use(cors())
app.use(express.json())
app.use("/upload",uploadRoutes)

app.get("/health",(req,res) => {
    res.json({ ok:true, time:Date.now() })
})

const PORT = 3000

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`)
})