#!/bin/bash
#

# Run this script to simulate many controllers connecting to game simultaneously

# TODO: Open different browsers (chrome, safari, and firefox)  

# TODO: At randomized intervals, close random windows and open others

echo "Starting long-term test spawning and disconnecting controllers..."
echo "Press [CTRL+C] to stop at any time..."

sleep 1

while :
do
	echo "Spawn/Kill loop. Press [CTRL+C] to stop.."
	SPAWN_RANDO=$(( ( RANDOM % 3 )  + 0 ))
	# Spawn a random amount of controllers
	bash ./spawn-controllers.sh $SPAWN_RANDO

	# Kill random controllers... (avg 15%)
	bash ./kill-chrome-controllers.sh

	sleep 5
done

echo "All done!"