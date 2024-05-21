const express = require('express');
const cors = require('cors');
const app = express();
const { MongoClient, ReturnDocument, Int32 } = require('mongodb');
app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://admin:1234@database.1p96qji.mongodb.net/"

app.post('/users/createMany', async (req, res) => {
    const users = req.body; // รับข้อมูลผู้ใช้หลายรายการ
    const client = new MongoClient(uri);

    try {
        await client.connect();

        // แปลงข้อมูลผู้ใช้เป็นรูปแบบที่ถูกต้องสำหรับการเพิ่มลงใน MongoDB
        const formattedUsers = users.map(user => ({
            Id: user.id,
            number: user.number,
            prefix: user.prefix,
            name: user.name,
            year: user.year,
        }));

        // เพิ่มข้อมูลผู้ใช้หลายรายการลงในคอลเล็กชัน users ในฐานข้อมูล mydb
        const result = await client.db("checkname").collection("users").insertMany(formattedUsers);

        res.status(200).send({
            status: "ok",
            message: "Users created successfully",
            insertedCount: result.insertedCount,
            insertedIds: result.insertedIds,
            users: formattedUsers
        });
    } catch (error) {
        console.error("Error inserting data:", error);
        res.status(500).send({
            status: "error",
            message: "Error inserting users"
        });
    } finally {
        await client.close();
    }
});

app.post("/day/createMany", async (req, res) => {
    const days = req.body;
    const client = new MongoClient(uri);

    try {
        await client.connect();

        const formatday = days.map((item) => (
            {
                Id: item.Id,
                day: item.day
            }

        ))

        const response = await client.db("checkname").collection("day_check").insertMany(formatday)

        res.status(200).send({
            status: "ok",
            message: "Users created successfully",
            insertedCount: response.insertedCount,
            insertedIds: response.insertedIds,
            days: formatday
        });
    } catch (error) {
        console.error("Error inserting data:", error);
        res.status(500).send({
            status: "error",
            message: "Error inserting users"
        });
    } finally {
        await client.close();
    }
})

app.get('/users/:gender', async (req, res) => {
    const client = new MongoClient(uri)
    const gender = parseInt(req.params.gender);
    // console.log("gender: " , gender);
    try {
        await client.connect();
        //client.db("checkname").collection("users").insertMany(formattedUsers);
        const response = await client.db("checkname").collection("check_mor_even")
            .find({})
            .sort({ Id_Day: -1 }) // เรียงลำดับ Id ในลักษณะแบบลดหลั่น
            .limit(1) // เลือกข้อมูลแรก (ค่า Id ที่มากที่สุด)
            .toArray();

        const latestDay = response[0].Id_Day;
        let responsetwo;
        if(gender === 0){
            responsetwo = await client.db("checkname").collection("check_mor_even")
            .find({Id_Day: latestDay , prefix:"นาย"})
            .sort({prefix: -1 , Id: 1 })
            .toArray();
        }else if(gender === 1){
            responsetwo = await client.db("checkname").collection("check_mor_even")
            .find({Id_Day: latestDay , prefix:"นางสาว"})
            .sort({prefix: -1 , Id: 1 })
            .toArray();
        }


        res.status(200).send(responsetwo)
    } catch (err) {
        console.error("Error inserting data:", err);
        res.status(500).send({  
            status: "error",
            message: "Error inserting users"
        });
    } finally {
        await client.close();
    }

});

app.get('/day', async (req, res) => {
    const client = new MongoClient(uri)

    try {
        await client.connect();
        const response = await client.db("checkname").collection("day_check").find({}).toArray();

        res.status(200).send(response);
    } catch (err) {
        console.error("Error inserting data:", err);
        res.status(500).send({
            status: "error",
            message: "Error inserting users"
        });
    } finally {
        await client.close();
    }

});

app.post('/createday', async (req, res) => {
    const day = req.body.day;
    const client = new MongoClient(uri)
    try {
        await client.connect();

        const createDay = async () => {
            // ดึงข้อมูลจาก users
            const users = await client.db("checkname").collection("users").find({}).toArray();

            // เช็คดึงข้อมูลมาจาก day_check
            const Retrieve = await client.db("checkname")
                .collection("day_check")
                .find({})
                .sort({ _id: -1 }) // เรียงลำดับ Id ในลักษณะแบบลดหลั่น
                .limit(1) // เลือกข้อมูลแรก (ค่า Id ที่มากที่สุด)
                .toArray();

            let result_day;
            let Update_id = 0;

            if (Retrieve.length === 0) {
                console.log(">>>Loading<<<");
                // ถ้ายังไม่มีข้อมูลใน collection day_check
                result_day = await client.db("checkname").collection("day_check").insertOne({
                    Id: Update_id,
                    day: day
                });
            } else {
                console.log(">>>Don't Loading<<<");
                Update_id = Retrieve[0].Id + 1;
                // เพิ่มข้อมูลวันที่ลงในตาราง day_check
                result_day = await client.db("checkname").collection("day_check").insertOne({
                    Id: Update_id,
                    day: day
                });
            }

            // เพิ่มข้อมูลสถานะกับข้อมูลที่ดึงมาจาก users ลงตาราง check_mor_even
            const morningEveningPromises = users.map(user => {
                return client.db("checkname").collection("check_mor_even").insertOne({
                    Id_Day: Update_id,
                    Day: day,
                    Id: user.Id,
                    number: user.number,
                    prefix: user.prefix,
                    name: user.name,
                    Year: user.year,
                    Morning: null,
                    Evening: null
                });
            });

            await Promise.all(morningEveningPromises);
        };

        await createDay();
        res.json({ result: true });
    } catch (err) {
        res.json({
            result: false,
            message: err.message
        });
    } finally {
        await client.close();
    }
});



app.delete('/deleteday/:id', async (req, res) => {
    const dayId = parseInt(req.params.id);
    console.log("dayId: ", dayId);
    if (Number.isInteger(dayId)) {
        console.log("dayId is Number")
    } else {
        console.log("dayId is not Number")
        // ค่าที่รับมาไม่ใช่จำนวนเต็ม
        // รีเทิร์นข้อผิดพลาดหรือทำการแปลงค่าตามที่เหมาะสม
    }

    const client = new MongoClient(uri);
    try {
        await client.connect();

        const response = await client.db("checkname").collection("day_check").deleteOne({ Id: dayId });

        const result = await client.db("checkname").collection("check_mor_even").deleteMany({ Id_Day: dayId })
        if (response.deletedCount === 1) {
            res.status(200).send({ result: true, message: "Day deleted successfully" });
        } else {
            res.status(404).send({ result: false, message: "Day not found" });
        }

    } catch (error) {
        res.json({
            result: false,
            message: error.message
        });
    } finally {
        await client.close();
    }
})

app.get('/check/:period/:userID', async (req, res) => {
    const period = parseInt( req.params.period);
    const userID = parseInt( req.params.userID);
    const client = new MongoClient(uri);
    // console.log("period: " , period);

    try {
        await client.connect();
        let results ;
        if( userID === 0){
            results = await client.db("checkname").collection("check_mor_even").find({Id_Day: period}).sort({prefix: -1 , Id: 1 }).toArray();
        }else if(userID === 1){
            results = await client.db("checkname").collection("check_mor_even").find({Id_Day: period , prefix: "นาย"}).sort({ Id: 1 }).toArray();
        }else if(userID === 2){
            results = await client.db("checkname").collection("check_mor_even").find({Id_Day: period , prefix: "นางสาว"}).sort({ Id: 1 }).toArray();
        }
        res.json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    } finally {
        await client.close();
    }
});

app.put('/updateMorning/:period', async (req, res) => {
    const input = req.body;
    const client = new MongoClient(uri);
    const period = parseInt( req.params.period);
    console.log("period: " , period);

    try {
        await client.connect();

        const result = await client.db("checkname").collection("check_mor_even").updateOne(
            { Id_Day: period , Id: input.Id },
            { $set: { Morning: input.morning } }
        );

        if (result.modifiedCount === 1) {
            res.status(200).json({ success: true });
        } else {
            res.status(404).json({ success: false, message: "No document found with the provided Id" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally {
        await client.close();
    }
});

app.put('/updateEvening/:period', async (req, res) => {
    const input = req.body;
    const client = new MongoClient(uri);
    const period = parseInt( req.params.period);

    try {
        await client.connect();

        const result = await client.db("checkname").collection("check_mor_even").updateOne(
            { Id_Day: period , Id: input.Id },
            { $set: { Evening: input.evening } }
        );

        if (result.modifiedCount === 1) {
            res.status(200).json({ success: true });
        } else {
            res.status(404).json({ success: false, message: "No document found with the provided Id" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    } finally {
        await client.close();
    }
});


app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});