import React, { useRef, useState, useEffect } from 'react';
import { SketchPicker } from "react-color";
import "./Canvas.css";

class Drawing {
  constructor(drawingId, color, lineWidth, pathData, timestamp, user) {
    this.drawingId = drawingId;
    this.color = color;
    this.lineWidth = lineWidth;
    this.pathData = pathData;
    this.timestamp = timestamp;
    this.user = user;
  }
}

class UserData {
  constructor(userId, username) {
    this.userId = userId;
    this.username = username;
    this.drawings = [];
  }

  addDrawing(drawing) {
    this.drawings.push(drawing);
  }
}

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;

function Canvas({ currentUser, setUserList, selectedUser }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(5);
  const [pathData, setPathData] = useState([]);
  const initializeUserData = () => {
    const uniqueUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    return new UserData(uniqueUserId, "MainUser");
  };

  // const [drawingResponse, setDrawingResponse] = useState([]);
  // const [userList, setUserLisr] = useState([]);

  const [userData, setUserData] = useState(() => initializeUserData());
  // const [userData, setUserData] = useState(new UserData("000001", "MainUser"));
  const tempPathRef = useRef([]); // Ref for immediate path data updates
  const [showColorPicker, setShowColorPicker] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setIsRefreshing(true);

    clearCanvas();
    refreshCanvas(0).then(() => {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500); // Delay 500 ms to stop the animation
    });
  }, [selectedUser])

  const startDrawing = (e) => {
    if (isRefreshing) {
      alert("Please wait for the canvas to refresh before drawing again.");
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x, y);

    console.log('START ' + x + ' ' + y);
    setPathData([{ x, y }]);
    tempPathRef.current = [{ x, y }];
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    context.lineTo(x, y);
    context.stroke();
    context.beginPath();
    context.moveTo(x, y);

    setPathData((prevPathData) => [
      ...prevPathData,
      { x, y }
    ]);
    tempPathRef.current.push({ x, y });
  };

  // Stop drawing to save the drawing data
  const stopDrawing = async () => {
    if (!drawing) return;
    setDrawing(false);
    console.log(pathData)

    const newDrawing = new Drawing(
      `drawing_${Date.now()}`,
      color,
      lineWidth,
      tempPathRef.current,
      new Date().toISOString()
    );

    setIsRefreshing(true);

    try {
      await submitToDatabase(newDrawing); // Wait for submit
      await refreshCanvas(userData.drawings.length);  // TODO: check the edge case
    } catch (error) {
      console.error("Error during submission or refresh:", error);
    } finally {
      setIsRefreshing(false);
    }

    setPathData([]); // Clear path data for next drawing
    tempPathRef.current = [];
  };

  const submitToDatabase = async (drawingData) => {
    console.log("Submitting sub-canvas data to NextRes:", drawingData);

    const apiPayload = {
      ts: drawingData.timestamp,
      value: JSON.stringify(drawingData),
      user: currentUser,
      deletion_date_flag: '',
    };

    const apiUrl = "http://67.181.112.179:10010/submitNewLine";

    try {
      // Send the data to the backend
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        throw new Error(`Failed to submit data: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Data successfully submitted to NextRes:", result);
    } catch (error) {
      console.error("Error submitting data to NextRes:", error);
    }
  };

  const refreshCanvas = async (from) => {
    const apiUrl = `http://67.181.112.179:10010/getCanvasData?from=${from}`; // Add parameter to URL
    // const apiUrl = `http://67.181.112.179:10010/getCanvasData?from=${from}&user=${user}`; // Add parameter to URL

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch canvas data: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.status !== "success") {
        throw new Error(`Error in response: ${result.message}`);
      }

      console.log('result is:')
      console.log(result)
      console.log(result.data)
      // setDrawingResponse(result.data)
      // console.log("drawingResponse:", drawingResponse)

      const newDrawings = result.data.map((item) => {
        const { id, value, user } = item;
        if (!value) return null;

        const drawingData = JSON.parse(value);

        return new Drawing(
          drawingData.drawingId,
          drawingData.color,
          drawingData.lineWidth,
          drawingData.pathData,
          drawingData.timestamp,
          user && user,
        );
      })
        .filter(Boolean);

      userData.drawings = [...userData.drawings, ...newDrawings]

      drawAllDrawings();

      console.log("Canvas successfully refreshed from:", from);
    } catch (error) {
      console.error("Error refreshing canvas:", error);
    }
  };

  const drawAllDrawings = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const userSet = new Set();

    userData.drawings.forEach((drawing) => {
      // Either load drawings from all users or load from one chosen user of user list
      // Load the rest with a lighter opacity
      // if (selectedUser == "" || drawing.user == selectedUser) {
      //   context.globalAlpha = 1.0
      // }
      context.globalAlpha = 1.0
      if (selectedUser != "" && drawing.user != selectedUser) {
        context.globalAlpha = 0.1
      }
      context.beginPath();
      context.strokeStyle = drawing.color;
      context.lineWidth = drawing.lineWidth;
      context.lineCap = "round";

      const pathData = drawing.pathData;
      if (pathData.length > 0) {
        context.moveTo(pathData[0].x, pathData[0].y);
        for (let i = 1; i < pathData.length; i++) {
          context.lineTo(pathData[i].x, pathData[i].y);
        }
        context.stroke();
      }
      if (drawing.user)
        userSet.add(drawing.user)
    });
    console.log("selectedUser:", selectedUser)
    if (selectedUser === "")
      setUserList(Array.from(userSet))
    console.log("selectedUser:", selectedUser)
    console.log("userSet:", userSet)
  };

  useEffect(() => {
    console.log('Call useEffect... Init...')
    setIsRefreshing(true);

    clearCanvas();
    refreshCanvas(0).then(() => {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500); // Delay 500 ms to stop the animation
    });
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    setUserData(initializeUserData());
  };

  // const handleColorChange = (newColor) => {
  //   setColor(newColor.hex);
  // };

  const toggleColorPicker = (event) => {
    const viewportHeight = window.innerHeight;
    const pickerHeight = 350; // Approximate height of the SketchPicker
    const rect = event.target.getBoundingClientRect();
    const pickerElement = document.querySelector(".Canvas-color-picker");

    setShowColorPicker(!showColorPicker);

    if (rect.bottom + pickerHeight > viewportHeight && pickerElement) {
      pickerElement.classList.add("Canvas-color-picker--adjust-bottom");
    } else if (pickerElement) {
      pickerElement.classList.remove("Canvas-color-picker--adjust-bottom");
    }
  };

  const closeColorPicker = () => {
    setShowColorPicker(false);
  };

  const refreshCanvasButtonHandler = async () => {
    if (isRefreshing) return; // Prevent concurrent refreshes

    console.log("Starting canvas refresh...");
    setIsRefreshing(true);

    try {
      clearCanvas(); // Synchronously clear the canvas
      await refreshCanvas(0);
    } catch (error) {
      console.error("Error during canvas refresh:", error);
    } finally {
      setIsRefreshing(false);
      console.log("Canvas refresh complete.");
    }
  };

  return (
    <div className="Canvas-container center" style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="Canvas-element"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      {isRefreshing && (
        <div className="Canvas-loading-overlay">
          <div className="Canvas-spinner"></div>
        </div>
      )}
      <div className="Canvas-controls">
        <div className="Canvas-label-group">
          <label className="Canvas-label">Color:</label>
          <div>
            <div
              className="Canvas-color-display"
              style={{ backgroundColor: color }}
              onClick={toggleColorPicker}
            ></div>
            {showColorPicker && (
              <div className="Canvas-color-picker">
                <SketchPicker
                  color={color}
                  onChange={(color) => setColor(color.hex)}
                />
                <button className="Canvas-close-button" onClick={closeColorPicker}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="Canvas-label-group">
          <label className="Canvas-label">Line Width:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(e.target.value)}
            className="Canvas-input-range"
          />
        </div>

        <button onClick={refreshCanvasButtonHandler} className="Canvas-button">
          Refresh Canvas
        </button>

        <button onClick={clearCanvas} className="Canvas-button">
          Clear Canvas
        </button>
      </div>
    </div>
  );
}

export default Canvas;
