/* eslint-disable no-sync, no-process-env */
import { docker } from './get-endpoints';
import fs from 'fs';

const UPSTREAM_DIR = '/etc/nginx/vhost.d';
const UPSTREAM_COMMENT = '# generated by nginx-proxy-swarm-upstream';
const NGINX_PROXY_CONTAINER = process.env.NGINX_PROXY_CONTAINER;

export function generateConfig (hosts, endpoints) {
  const servers = endpoints.map(endpoint => `server ${endpoint};`).join('\n');
  const config = `
  ${UPSTREAM_COMMENT}
  ${servers}
  ip_hash;
  `;

  hosts.forEach(host => {
    const path = `${UPSTREAM_DIR}/${host}_upstream`;

    fs.writeFileSync(path, config);
  });
}

export function reloadNginx () {
  console.log('Reloading nginx');

  docker.getContainer(NGINX_PROXY_CONTAINER).exec({
    Cmd: [ 'sh', '-c', '/app/docker-entrypoint.sh /usr/local/bin/docker-gen /app/nginx.tmpl /etc/nginx/conf.d/default.conf; /usr/sbin/nginx -s reload' ],
    AttachStdin: false,
    AttachStdout: true
  }, (err, exec) => {
    if (err) {
      console.log(err);

      return;
    }

    exec.start({
      hijack: true,
      stdin: false
    }, (_err, stream) => {
      if (_err) {
        console.log(_err);
      }

      docker.modem.demuxStream(stream, process.stdout, process.stderr);
    });
  });
}
