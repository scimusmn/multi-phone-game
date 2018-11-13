#!/bin/bash

# Run this script to simulate many controllers connecting to game simultaneously

# This script would open multiple browsers (chrome, safari, and firefox) to "http://localhost:3000/?simulateInput" 

# At randomized intervals, this script could also close specific browser windows, and open others

# This would ideally create a good testing simulation of many visitors connecting and disconnecting

# Is there a way we could simulate the same thing, but using simulated mobile browsers?
# 
# 

CONTROLLER_URL="http://localhost:3000/?simulateInput=true"

# Spawns single controller by default, 
# but takes first command flag ( e.g. $bash simulate-controllers.sh 20 )
SPAWN_COUNT=${1:-1}

for ((i=1; i<=SPAWN_COUNT; i++)); 
	do
		myControllerURL=$CONTROLLER_URL+"&prefillName=AI_$i"
		open -na "Google Chrome" --args --new-window $myControllerURL --window-size="300,300" --window-position="100,100" 
		echo $i
		echo 'URL: '+$myControllerURL
    	sleep 0.5
done

echo "All done!"