# syntax=docker/dockerfile:1.7

# ─── Stage 1: build ───────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Cache dependencies in a dedicated layer + BuildKit cache mount for ~/.m2
# so subsequent rebuilds skip the dependency download entirely.
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -e dependency:go-offline

# Compile and package. Skip test *compile* + execution — tests run in CI,
# not in the production image build (Testcontainers would need Docker-in-Docker).
COPY src src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -Dmaven.test.skip=true package

# Extract the layered JAR so the final image can cache framework deps separately.
RUN mkdir -p target/extracted && \
    java -Djarmode=tools -jar target/*.jar extract --layers --launcher --destination target/extracted

# ─── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

# Non-root runtime user. Create the uploads directory under the user's
# ownership BEFORE the docker-compose volume mount initialises — empty named
# volumes inherit the underlying image's permissions on first run.
RUN addgroup -S spring && adduser -S -G spring spring && \
    mkdir -p /app/uploads && chown -R spring:spring /app
USER spring:spring

# Copy the extracted Spring Boot layers — least-changing first, so dependency
# layers stay cached across rebuilds.
COPY --from=build --chown=spring:spring /workspace/target/extracted/dependencies/         ./
COPY --from=build --chown=spring:spring /workspace/target/extracted/spring-boot-loader/   ./
COPY --from=build --chown=spring:spring /workspace/target/extracted/snapshot-dependencies/ ./
COPY --from=build --chown=spring:spring /workspace/target/extracted/application/          ./

ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=10 \
  CMD wget -q -O - http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
