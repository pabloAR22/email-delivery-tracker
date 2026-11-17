# AWS Emulator oficial: solo corre nativo en Linux, así que en macOS va en Docker.
FROM alpine:3 AS download
ARG TARGETARCH
RUN ARCH=$([ "$TARGETARCH" = "arm64" ] && echo aarch64 || echo x86_64) \
 && wget -q -O /aws-emulator.rpm "https://downloads.aws.com/aws-emulator/packages/aws-emulator/LTS/latest/aws-emulator-$ARCH.rpm"

FROM public.ecr.aws/amazonlinux/amazonlinux:2023-minimal
COPY --from=download /aws-emulator.rpm /tmp/
RUN rpm -i /tmp/aws-emulator.rpm && rm /tmp/aws-emulator.rpm
ENTRYPOINT ["aws-emulator", "-b", "0.0.0.0", "--telemetry", "off"]
