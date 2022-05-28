import { Box, Typography, useMediaQuery, Button } from "@mui/material";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const matches = useMediaQuery("(min-width:600px)");
  const videoRef = useRef(null);

  useEffect(() => {
    (async () => {
      let stream  = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      console.log(videoRef);
      videoRef.current.srcObject =stream ;
    })();
  }, []);

  return (
    <Box height="100vh" width="100%" display="flex" flexDirection="column">
      <Box>
        <Box padding="10px">
          <Typography variant="h3" component="div">
            Not Alone
          </Typography>
        </Box>
      </Box>
      <Box display="flex" flexDirection="column" flex="1">
        <Box display="flex" flexDirection={matches ? "row" : "column"}>
          <Box flex="1">
            <video autoPlay width="100%" height="100%" ref={videoRef}></video>
          </Box>
          <Box flex="1">
            <video width="100%" height="100%">
              <source
                src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
                type="video/mp4"
              />
            </video>
          </Box>
        </Box>

        <Box
          display="flex"
          flex="1.5"
          flexDirection={matches ? "row" : "column"}
        >
          <Box
            display="flex"
            justifyItems="center"
            alignItems="center"
            padding="10vw"
          >
            <Button variant="contained">Start</Button>
          </Box>
          <Box bgcolor="orange" flex="1">
            <video />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
