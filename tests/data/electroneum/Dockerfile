FROM ubuntu:xenial
MAINTAINER sh@analogic.cz

ADD https://github.com/just-containers/s6-overlay/releases/download/v1.17.2.0/s6-overlay-amd64.tar.gz \
    https://github.com/electroneum/electroneum/releases/download/v0.11.0.0/linux-x64-0.11.0.0.zip \
    /tmp/

RUN tar xzf /tmp/s6-overlay-amd64.tar.gz -C / && \
    apt-get update && apt-get install -y --no-install-recommends bzip2 unzip && \
    cd /tmp && unzip linux-x64-0.11.0.0.zip && cp -r /tmp/electroneum* /usr/bin && \
    apt-get remove -y bzip2 unzip && \
    rm -rf /usr/share/man/* /usr/share/groff/* /usr/share/info/* /var/cache/man/* /tmp/* /var/lib/apt/lists/*

EXPOSE 28080 38080 28081 38081 28082 38082

ENTRYPOINT ["/init"]
VOLUME ["/data"]
ADD rootfs /
