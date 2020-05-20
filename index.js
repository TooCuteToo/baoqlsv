const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const path = require("path");

const alert = require("alert");
const cors = require("cors");
const router = require("./router");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const db = require("./db");
const { Connection, Request, TYPES } = require("tedious");
const { userName, password } = db.authentication.options;

app.use(router);
app.use(cors());

const publicPath = path.join(__dirname, "../client/dist");

app.use(express.static(path.join(publicPath)));

app.get("*", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

console.log(publicPath);

io.on("connect", (socket) => {
  const connection = new Connection(db);

  // Storage
  let colNames = [];
  let values = [];

  socket.on("join", ({ name, pass }, callback) => {
    if (name !== userName || pass !== password) {
      socket.disconnect();
      return alert("Password isn't correct");
    }

    connection.on("connect", (err) => {
      if (err) console.error(err.message);
      else queryDatabase();
    });

    const queryDatabase = (sqlRequest = "select * from KHOA") => {
      // Read all rows from table
      const request = new Request(sqlRequest, (err) => {
        if (err) console.error(err.message);
        else {
          colNames = [];
          values = [];
        }
      });

      socket.on("getRequest", (sqlRequest) => queryDatabase(sqlRequest));

      request.on("row", (columns) => {
        columns.forEach((column) => {
          const { colName } = column.metadata;
          const { value } = column;
          colNames = [...new Set([...colNames, colName])];
          values = [...values, value];
          socket.emit("getData", { colNames, values });
        });
      });

      connection.execSql(request);
    };

    socket.on("insertSql", (sqlRequest, editObj) => {
      console.log(editObj);
      const editConnect = new Connection(db);
      editConnect.on("connect", (err) => {
        if (err) console.error(err.message);
        else {
          console.log(sqlRequest);
          const options = { checkConstraints: true };
          const bulkLoad = editConnect.newBulkLoad(
            sqlRequest,
            options,
            (error, rowCount) => {
              console.log("inserted %d rows", rowCount);
              queryDatabase();
            }
          );

          // KHOA
          if (sqlRequest === "KHOA") {
            bulkLoad.addColumn("MAKH", TYPES.Char, {
              nullable: false,
              length: 10,
            });

            bulkLoad.addColumn("TENKH", TYPES.NVarChar, {
              length: 31,
              nullable: false,
            });
          } else if (sqlRequest === "LOP") {
            bulkLoad.addColumn("MALOP", TYPES.Char, {
              nullable: false,
              length: 10,
            });

            bulkLoad.addColumn("TENLOP", TYPES.NVarChar, {
              length: 51,
              nullable: false,
            });

            bulkLoad.addColumn("SISO", TYPES.Int, {
              nullable: false,
            });

            bulkLoad.addColumn("LOPTRUONG", TYPES.NVarChar, {
              length: 31,
              nullable: true,
            });

            bulkLoad.addColumn("MAKH", TYPES.Char, {
              length: 10,
              nullable: false,
            });
          } else if (sqlRequest === "SINHVIEN") {
            bulkLoad.addColumn("MASV", TYPES.Char, {
              nullable: false,
              length: 10,
            });

            bulkLoad.addColumn("HOTEN", TYPES.NVarChar, {
              length: 31,
              nullable: false,
            });

            bulkLoad.addColumn("NGSINH", TYPES.Date, {
              nullable: true,
            });

            bulkLoad.addColumn("GTINH", TYPES.NVarChar, {
              length: 10,
              nullable: true,
            });

            bulkLoad.addColumn("DCHI", TYPES.NVarChar, {
              length: 51,
              nullable: true,
            });

            bulkLoad.addColumn("MALOP", TYPES.Char, {
              nullable: false,
              length: 10,
            });
          } else if (sqlRequest === "GIANGVIEN") {
            bulkLoad.addColumn("MAGV", TYPES.Char, {
              nullable: false,
              length: 10,
            });

            bulkLoad.addColumn("TENGV", TYPES.NVarChar, {
              length: 31,
              nullable: false,
            });

            bulkLoad.addColumn("MAKH", TYPES.Char, {
              length: 10,
              nullable: false,
            });
          } else if (sqlRequest === "MONHOC") {
            bulkLoad.addColumn("MAMH", TYPES.Char, {
              nullable: false,
              length: 10,
            });

            bulkLoad.addColumn("TENMH", TYPES.NVarChar, {
              length: 31,
              nullable: false,
            });

            bulkLoad.addColumn("SOTC", TYPES.Int, {
              nullable: true,
            });
          } else if (sqlRequest === "DIEM") {
            bulkLoad.addColumn("MASV", TYPES.Char, {
              nullable: false,
              length: 10,
            });

            bulkLoad.addColumn("MAMH", TYPES.Char, {
              nullable: false,
              length: 10,
            });

            bulkLoad.addColumn("LANTHI", TYPES.Int, {
              nullable: true,
            });

            bulkLoad.addColumn("DIEMTHI", TYPES.Float, {
              nullable: true,
            });
          } else {
            bulkLoad.addColumn("MAGV", TYPES.Char, {
              nullable: false,
              length: 10,
            });

            bulkLoad.addColumn("MAMH", TYPES.Char, {
              nullable: false,
              length: 10,
            });

            bulkLoad.addColumn("NAMHOC", TYPES.Char, {
              length: 20,
              nullable: true,
            });

            bulkLoad.addColumn("HOCKI", TYPES.Int, {
              nullable: true,
            });
          }

          bulkLoad.addRow(editObj);

          editConnect.execBulkLoad(bulkLoad);
        }
      });
    });
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server has started. ${PORT}`));
