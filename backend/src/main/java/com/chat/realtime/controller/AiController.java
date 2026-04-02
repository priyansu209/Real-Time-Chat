package com.chat.realtime.controller;

import com.chat.realtime.model.ChatMessage;
import com.chat.realtime.repository.ChatMessageRepository;
import com.chat.realtime.service.AiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private AiService aiService;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @GetMapping("/summarize/{chatId}")
    public CompletableFuture<ResponseEntity<String>> summarize(@PathVariable String chatId) {
        List<ChatMessage> messages = chatMessageRepository.findByChatIdOrderByTimestampAsc(chatId);
        return aiService.summarizeChat(messages)
                .thenApply(ResponseEntity::ok);
    }

    @PostMapping("/smart-reply")
    public CompletableFuture<ResponseEntity<String>> getSmartReply(@RequestBody String lastMessageContext) {
        return aiService.generateSmartReply(lastMessageContext)
                .thenApply(ResponseEntity::ok);
    }
}
