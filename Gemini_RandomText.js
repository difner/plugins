/*:
 * @plugindesc v1.2.0 Displays random text from an event's Comment command.
 * @author Gemini
 * @target MZ
 * @version 1.2.0
 *
 * @command showRandomText
 * @text Show Random Text
 * @desc Reads a Comment command in a specified event, picks a random line of text, and displays it.
 *
 * @arg eventId
 * @text Event ID
 * @desc The ID of the event to get the text from. Set this to a variable for use with Common Events.
 * @type variable
 * @default 0
 *
 * @help
 * Gemini_RandomText.js
 * Version 1.2.0
 *
 * This plugin allows you to make NPCs say different things at random each time
 * the player interacts with them. This version reads text from a Comment command,
 * which is easier to edit than notetags.
 *
 * --- How to Use ---
 *
 * STEP 1: SETUP THE NPC EVENT'S COMMENT
 * -------------------------------------
 * On the map, select the event you want to give random dialogue to (e.g., an NPC).
 * In its event "Contents", add a "Comment..." command.
 *
 * Inside the Comment box, type your random messages in the following format:
 *
 * RandomText:Hello there!|I heard a rumor about the old castle.|Welcome to our village.
 *
 * IMPORTANT:
 * - The line MUST begin with "RandomText:" (it is not case-sensitive).
 * - Separate each different message with a pipe character: |
 * - All the text must be in a single Comment command.
 *
 * You can have as many messages as you want, just separate them with a '|'.
 *
 * STEP 2: SETUP THE COMMON EVENT
 * ------------------------------
 * 1. Go to the Database (F9) and click on the "Common Events" tab.
 *
 * 2. Create a new Common Event. Let's name it "NPC Random Talk".
 *
 * 3. In the event's "Contents", add a "Plugin Command...".
 *
 * 4. For "Plugin Name", select this plugin ("Gemini_RandomText").
 *
 * 5. For "Command Name", select "Show Random Text".
 *
 * 6. You will see an argument called "Event ID". This is the most
 * important part. We need to tell the common event WHICH NPC is talking.
 * - Click the box for "Event ID" and set it to a variable.
 * For example, Variable 0001. You can name this variable
 * "TempEventID" for clarity.
 *
 * 7. Immediately AFTER the Plugin Command, add a "Show Text..." command.
 * - You can leave the text box for this command completely empty. Its only
 * purpose is to open the message window to display the random text
 * that the plugin command prepared.
 *
 * Your Common Event should look like this:
 * ◆Plugin Command：Gemini_RandomText, Show Random Text
 * ：           ：Event ID = V[1]
 * ◆Show Text：Window, Bottom, None
 * ：         ：
 *
 * STEP 3: MAKING THE NPC USE THE COMMON EVENT
 * -------------------------------------------
 * 1. Go back to your NPC event on the map.
 *
 * 2. In its event command list (the "Contents"), add the first command:
 * "Control Variables..."
 * - Set "Variable" to the one you used in the common event (e.g., 0001:TempEventID).
 * - Set "Operation" to "Set".
 * - Set "Operand" to "Game Data..." -> "Event ID". This will get the ID
 * of the current NPC.
 *
 * 3. Add the second command: "Common Event..."
 * - Select the "NPC Random Talk" common event you created.
 *
 * Now, when you talk to that NPC, it will:
 * - Store its own Event ID into Variable 1.
 * - Call the common event.
 * - The common event will find the NPC, read its special Comment command,
 * pick a random line, and show it in a message box.
 */

(() => {
    'use strict';

    const pluginName = "Gemini_RandomText";

    PluginManager.registerCommand(pluginName, "showRandomText", function(args) {
        // Get the Event ID from the command's arguments, which is stored in a variable.
        const variableId = Number(args.eventId);
        if (!variableId) {
             console.warn(`${pluginName}: The Event ID argument is not set to a valid variable.`);
             return;
        }
        const eventId = $gameVariables.value(variableId);

        // Determine which event we are targeting.
        const targetEventId = eventId > 0 ? eventId : this.eventId();
        if (!targetEventId) {
            console.warn(`${pluginName}: Could not determine a target Event ID from Variable ${variableId}.`);
            return;
        }

        const event = $gameMap.event(targetEventId);
        if (!event) {
            console.warn(`${pluginName}: Event with ID ${targetEventId} could not be found on the current map.`);
            return;
        }

        const commandList = event.list();
        if (!commandList) return;

        let textBlock = null;
        const trigger = "randomtext:";

        // Find the special comment in the event's command list.
        for (const command of commandList) {
            // Command code 108 is for a 'Comment'. We only check the first line of a comment block.
            if (command.code === 108) {
                const commentText = command.parameters[0] || '';
                if (commentText.trim().toLowerCase().startsWith(trigger)) {
                    // Extract the text part after the trigger.
                    textBlock = commentText.trim().substring(trigger.length);
                    break; // Found the comment, stop searching.
                }
            }
        }
        
        if (textBlock) {
            // Split the text block by the pipe '|' character.
            // .map(line => line.trim()) cleans up any extra spaces around the pipes.
            // .filter(line => line !== '') removes any empty entries.
            const lines = textBlock.split('|').map(line => line.trim()).filter(line => line !== '');

            if (lines.length > 0) {
                const randomIndex = Math.floor(Math.random() * lines.length);
                const randomText = lines[randomIndex];

                // Add the selected text to the game's message queue.
                // The subsequent "Show Text" command in the event list will display it.
                $gameMessage.add(randomText);
            }
        } else {
            console.warn(`${pluginName}: Event ${targetEventId} does not have a 'RandomText:' comment.`);
        }
    });

})();
