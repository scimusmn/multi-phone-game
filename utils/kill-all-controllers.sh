#!/bin/bash

echo "Terminating ALL chrome controllers."

# This Apple Script finds all Chrome controllers
# and closes them.
osascript -e 'tell application "Google Chrome"
	set windowList to every tab of every window whose URL starts with "https://play.smm.org/?simulateInput"
	repeat with tabList in windowList
		set tabList to tabList as any
		repeat with tabItr in tabList
			set tabItr to tabItr as any
			delete tabItr
		end repeat
	end repeat
end tell'