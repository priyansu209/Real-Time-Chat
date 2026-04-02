package com.chat.realtime.controller;

import com.chat.realtime.model.ChatMessage;
import com.chat.realtime.repository.ChatMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Date;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @MessageMapping("/chat.sendMessage")
    public void processMessage(@Payload ChatMessage chatMessage) {
        chatMessage.setTimestamp(new Date());
        
        chatMessageRepository.save(chatMessage); // Persist message so AI can read it later

        // Multi-threading: STOMP messages are handled by a thread pool inherently by
        // Spring's DispatcherServlet and Broker channels.

        // If it's a private message, route it to a specific user's queue
        if (chatMessage.getRecipientId() != null && !chatMessage.getRecipientId().isEmpty()) {
            // Save to DB (omitted for brevity, would be done by a service)
            messagingTemplate.convertAndSendToUser(
                    chatMessage.getRecipientId(), "/queue/messages", chatMessage);
        } else {
            // Public message to a group or public topic
            messagingTemplate.convertAndSend("/topic/public", chatMessage);
        }
    }

    @MessageMapping("/chat.typing")
    public void typingIndicator(@Payload ChatMessage typingAlert) {
        if (typingAlert.getRecipientId() != null && !typingAlert.getRecipientId().isEmpty()) {
            messagingTemplate.convertAndSendToUser(
                    typingAlert.getRecipientId(), "/queue/typing", typingAlert);
        }
    }
}
