import gradio as gr

# Backend function that processes the chat response
def chat_response(user_message):
    # Replace this with actual LLM processing code
    response = f"Echo: {user_message}"
    return response

chat_html = '''
<div class="chat__main">
    <div id="chat__container" class="chat__container">
        <div id="chat__window" class="chat__window">
            <!-- Chat messages will appear here -->
        </div>
        <h1 class="chat__hi">Hi, what can I help you with today?</h1>
        <div class="chat__controls">
            <input type="text" id="user__input" class="user__input" placeholder="Type your message..." />
            <button id="send__button" class="send__button">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="icon-2xl"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.1918 8.90615C15.6381 8.45983 16.3618 8.45983 16.8081 8.90615L21.9509 14.049C22.3972 14.4953 22.3972 15.2189 21.9509 15.6652C21.5046 16.1116 20.781 16.1116 20.3347 15.6652L17.1428 12.4734V22.2857C17.1428 22.9169 16.6311 23.4286 15.9999 23.4286C15.3688 23.4286 14.8571 22.9169 14.8571 22.2857V12.4734L11.6652 15.6652C11.2189 16.1116 10.4953 16.1116 10.049 15.6652C9.60265 15.2189 9.60265 14.4953 10.049 14.049L15.1918 8.90615Z" fill="#2F2F2F"></path></svg>
            </button>
        </div>
    </div>
</div>
<style>
    * {
        color: lightgray;
        background: transparent;
        font-family: ui-sans-serif,-apple-system,system-ui,Segoe UI,Helvetica,Apple Color Emoji,Arial,sans-serif,Segoe UI Emoji,Segoe UI Symbol;
    }
    
    .gradio-container {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
    }

    .chat__hi {
        text-align: center;
        margin-bottom: 3rem !important;
        font-size: 2rem !important;
    }

    .chat__main {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        place-content: center;
        height: 100vh;
        background: #212121;
    }

    .chat__container {
        width: 100%;
        max-width: 700px;
        padding: 10px;
        border-radius: 10px;
    }

    .chat__controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        background-color: #2F2F2F;
        padding: .7rem;
        border-radius: 2rem;
    }

    .chat__window {
        height: 300px;
        overflow-y: auto;
        padding: 10px;
        margin-bottom: 10px;
    }

    .user__input {
        width: 100% !important;
        padding: 8px !important;
        font-size: 1rem !important;
        border: none !important;
        outline: none !important;
        background: transparent !important;
        color: lightgray !important;
        margin: 0 !important;
        line-height: 1rem !important;
    }

    .send__button {
        width: fit-content !important;
        padding: 0.2rem !important;
        border-radius: 50% !important;
        background: lightgray !important;
        color: white !important;
        border: none !important;
        cursor: pointer !important;
        transition: .1s !important;
    }
    .send__button:hover {
        opacity: .8 !important;
    }

    .message__user {
        padding: 5px;
        margin: 5px 0;
        border-radius: 5px;
        background-color: #e1ffc7;
        align-self: flex-end;
    }

    .message__bot {
        padding: 5px;
        margin: 5px 0;
        border-radius: 5px;
        background-color: #d0e7ff;
        align-self: flex-start;
    }
    
    footer { 
        display: none !important;
    }
</style>
<script>
    const chatWindow = document.getElementById('chat__window');
    const userInput = document.getElementById('user__input');
    const sendButton = document.getElementById('send__button');

    // Function to add messages to chat window
    function addMessage(text, isUser) {
        
        const message = document.createElement('div');
        message.textContent = text;
        message.style.padding = '5px';
        message.style.margin = '5px 0';
        message.style.borderRadius = '5px';
        message.style.backgroundColor = isUser ? '#e1ffc7' : '#d0e7ff';
        message.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
        chatWindow.appendChild(message);
        chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to bottom
    }

    // Send message on button click
    sendButton.addEventListener('click', async () => {
        const userMessage = userInput.value;
        if (userMessage.trim() !== "") {
            addMessage(userMessage, true); // Display user's message
            userInput.value = ""; // Clear input field

            // Call the backend Gradio function
            const response = await gr.Interface.callFunction('chat_response', [userMessage]);
            addMessage(response, false); // Display response message
        }
    });
</script>
'''

# Create Gradio Interface
iface = gr.Interface(
    fn=chat_response,        # The backend function for processing
    inputs="text",           # Define inputs
    outputs="text",          # Define outputs
    live=False,              # No need for live processing here
)

# Add the custom HTML as a separate component
iface = gr.Blocks()  # Blocks allow you to add custom HTML alongside Gradio components

with iface:
    gr.HTML(chat_html)  # Add the custom chat HTML
    iface.load(fn=chat_response)  # Link to the backend function

iface.launch(share=True)  # Launch the app and share it
