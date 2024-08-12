---- MAIN.html ----
Don't mind the badly written code, it is mostly rushed (I just wanted a simple interface for my friends to play my games)
The background is a gradient, black to dark, dark gray.
I used the Google Pixelify Sans font: https://fonts.google.com/specimen/Pixelify+Sans
And the monospace default font for the rest.
As for the projects I used a simple grid layout with css.
I wrapped each div (project) in a <a> element with the corresponding url and made the text appear like normal text (without the ugly default link look)
The overall file is very badly indentated, I wrote the code using Windows Note-Pad.

---- SLOT MACHINE ----
Simple slot machine, just be careful if you have epilepsy, the game does have flashing colors
Use the Roll button to activate the slot machine, and you can press the check box under the Auto-Roll text to use the auto-roll feature (it just rolls automatically after you press roll once).
When you press the Roll button, it just sets rolling to true and starts a "timer" by setting rollstart to the current time using Date.getTime().
I just stored all possible color values: ["red","green","blue","gray"] in a const called ROLLS to simplify the randomness.
Each frame, the game checks if rolling is true (if the player is currently gambling) and checks if the "timer" ended. If not, it just randomises each of the current squares to what is in ROLLs.
If the "timer" ended, rolling is set to false, and we check if the player got a jackpot. If the player got a jackpot, we send an alert, then play the jackpot sounds ("Slot Machine Jackpot Sounds" and "Tuca Donka")
Each time we roll, we play the coin inserted sound.

---- SNAKE ----
Normal snake game.
I dont think I need to explain what the code is, just read it, pretty readable.
If you dont understand, I'll probably add more info later.
