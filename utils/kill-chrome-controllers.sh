#!/bin/bash

echo "Terminating randomly chosen chrome controllers."

# This Apple Script finds all Chrome controllers
# and closes then randomly with 15% chance.
osascript -e 'tell application "Google Chrome"
	set windowList to every tab of every window whose URL starts with "https://play.smm.org/?simulateInput"
	repeat with tabList in windowList
		set tabList to tabList as any
		repeat with tabItr in tabList
			set tabItr to tabItr as any
			set shouldCloseRandom to random number from 0 to 100
			if shouldCloseRandom < 15 then delete tabItr
		end repeat
	end repeat
end tell'