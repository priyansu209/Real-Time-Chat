package com.chat.realtime.service;

import com.chat.realtime.model.ChatMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
public class AiService {

    @Value("${huggingface.api.key}")
    private String apiKey;

    @Value("${huggingface.api.url}")
    private String apiUrl;

    @Async("aiTaskExecutor")
    public CompletableFuture<String> summarizeChat(List<ChatMessage> messages) {
        if (messages == null || messages.isEmpty()) {
            return CompletableFuture.completedFuture("No messages to summarize.");
        }
        
        StringBuilder promptBuilder = new StringBuilder("Summarize the following chat conversation concisely:\n");
        for (ChatMessage msg : messages) {
            promptBuilder.append(msg.getSenderId()).append(": ").append(msg.getContent()).append("\n");
        }
        
        String summary = callHuggingFaceApi(promptBuilder.toString());
        return CompletableFuture.completedFuture(summary);
    }

    @Async("aiTaskExecutor")
    public CompletableFuture<String> generateSmartReply(String lastMessageContext) {
        String prompt = "Suggest a short, friendly, and smart reply to this message: \"" + lastMessageContext + "\". Return only the reply text.";
        String reply = callHuggingFaceApi(prompt);
        return CompletableFuture.completedFuture(reply);
    }

    private String callHuggingFaceApi(String prompt) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);
            
            // Clean up prompt to prevent JSON parsing errors
            String sanitizedPrompt = prompt.replace("\"", "\\\"").replace("\n", " ");
            String requestJson = "{\"inputs\":\"" + sanitizedPrompt + "\"}";
            
            HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, entity, String.class);
            return extractTextFromJson(response.getBody()); 
        } catch (Exception e) {
            e.printStackTrace();
            return "AI Generation failed: " + e.getMessage();
        }
    }
    
    private String extractTextFromJson(String json) {
        // Very basic extraction to avoid adding Jackson JsonNode boilerplates here
        if (json == null) return "";
        try {
            int textIndex = json.indexOf("\"generated_text\":\"");
            if (textIndex != -1) {
                int start = textIndex + 18;
                int end = json.indexOf("\"", start);
                String result = json.substring(start, end).trim();
                // Check if the original prompt is echoed back and strip it
                if (result.contains("Return only the reply text.")) {
                    result = result.substring(result.lastIndexOf("Return only the reply text.") + 27).trim();
                }
                return result;
            }
        } catch (Exception ignored) {}
        return json;
    }
}
