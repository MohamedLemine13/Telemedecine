package com.irt42.telemedecine.storage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * Filesystem-backed file storage.
 *
 * <p>Layout: every persisted file lives under
 * {@code <root>/<area>/<uuid>-<sanitized-filename>}. The relative path
 * (e.g. {@code credentials/abcd…ef-diploma.pdf}) is returned to callers as
 * the storage "key" — they save it in the database alongside the
 * content-type and size and re-use it for downloads later.
 *
 * <p>Backed by a Docker volume at {@code /app/uploads} so uploaded files
 * survive container restarts.
 */
@Service
@EnableConfigurationProperties(StorageProperties.class)
public class LocalFileStorage {

    public record Stored(String key, String name, String contentType, long sizeBytes) {}

    private static final Logger log = LoggerFactory.getLogger(LocalFileStorage.class);

    private final StorageProperties props;
    private Path root;

    public LocalFileStorage(StorageProperties props) {
        this.props = props;
    }

    @PostConstruct
    void init() throws IOException {
        this.root = Path.of(props.root()).toAbsolutePath();
        Files.createDirectories(root);
        log.info("LocalFileStorage root = {}", root);
    }

    public Stored store(String area, MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IOException("Empty upload");
        }
        long maxBytes = props.maxFileSizeMb() * 1024L * 1024L;
        if (file.getSize() > maxBytes) {
            throw new IOException("File exceeds " + props.maxFileSizeMb() + " MB");
        }

        Path dir = root.resolve(area);
        Files.createDirectories(dir);

        String safeName = sanitize(file.getOriginalFilename());
        String key = area + "/" + UUID.randomUUID() + "-" + safeName;
        Path target = root.resolve(key);

        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }

        return new Stored(key, safeName, file.getContentType(), file.getSize());
    }

    /** Resolve a stored key to an absolute Path for streaming reads. */
    public Path resolve(String key) {
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) {
            // Defence-in-depth against directory traversal — should be impossible
            // since `key` only comes from store() above, but cheap to check.
            throw new IllegalArgumentException("Key escapes storage root: " + key);
        }
        return target;
    }

    private static String sanitize(String filename) {
        if (filename == null || filename.isBlank()) return "file";
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }
}
