# obdi-aws-p2ec2
Creates AWS EC2 Instances from Full System Backups.

Dependencies: [obdi-aws-ec2lib](https://github.com/mclarkson/obdi-aws-ec2lib)

Known Users: [obdi-rsyncbackup](https://github.com/mclarkson/obdi-rsyncbackup)

# Todo


# Screenshot

![](images/obdi-aws-p2ec2-small.png?raw=true)

# What is it?

No entry is made in the sidebar for this plugin since this plugin is accessed
from other compatible plugins. For example, when this plugin is installed, the
obdi-rsyncbackup plugin will show a 'Create Amazon EC2 Instance' button in the
file viewer when it thinks it has found a root filesystem. Pressing the button
will take the user to this plugin.

# Installation

## Installing the plugin

* Log into the admin interface, 'https://ObdiHost/manager/admin'.
* In Plugins -> Manage Repositories add, 'https://github.com/mclarkson/obdi-awstools-repository.git'
* In Plugins -> Add Plugin, choose 'aws-p2ec2' and Install.

## Configuration

Set the AWS_ACCESS_KEY_ID_1 json object in the environment, using the Admin interface.
```
{
    "Aws_access_key_id":"ALIENX2KD6OINVA510NQ",
    "Aws_secret_access_key":"wHdlwoigU637fgnjAu+IRNVHfT-EXnIU5C2MbiQd",
    "Aws_obdi_worker_instance_id":"i-e29eg362",
    "Aws_obdi_worker_region":"us-east-1",
    "Aws_obdi_worker_url":"https://1.2.3.4:4443/",
    "Aws_obdi_worker_key":"secretkey",
    "Aws_filter":"key-name=groupkey"

    "Aws_dnsserver_ip":"10.17.3.163",
    "Aws_dnsdomain":"karmalab.net",
    "Aws_gateway":"10.17.0.1",
    "Aws_obdi_worker_ip":"172.31.16.14",
    "Aws_shell_user_name":"centos",
    "Aws_shell_ssh_key_b64":"LS0tLSTXdURGxLU...1ySBQUklWQVRFIEtFWS0tLS0t"
}
```

The following variables are used up until OS modifications by the Javascript/HTML code.

*Aws_access_key_id*
> AWS API access key ID

*Aws_secret_access_key*
> AWS API password

*Aws_obdi_worker_instance_id*
> The AWS instance that contains the Obdi worker.
> This AWS instance will be used to copy, mount and modify the backup image.

*Aws_obdi_worker_region*
> The region the Obdi worker resides in.

*Aws_obdi_worker_url*
> The URL used to access the Obdi worker.

*Aws_obdi_worker_key*
> The password for the Obdi worker.

*Aws_filter*
> The global filter to apply, if any. For example, you might want to filter all
> results by 'key-name=ourkeyname' or 'owner-id=25513944296'.

The following variables are used when modifying the OS by the Bash script:

*Aws_dnsserver_ip* and *Aws_dnsdomain*
> Should both be set to avoid an error message. Affects the final '/etc/resolv.conf'.

*Aws_gateway*
> Affects the networking in '/etc/sysconfig/network-scripts/ifcfg-eth0'.

*Aws_obdi_worker_ip*
> The IP address of the AWS instance, Aws_obdi_worker_instance_id. This is the address
> as seen from the Backup server.

*Aws_shell_user_name*
> User name to use to connect to Aws_obdi_worker_ip using ssh.

*Aws_shell_ssh_key_b64*
> The base64 encoded key file.

# Dev

![](images/instance-creation.png?raw=true)

### get-not-so-secret-data

Gets Json Object Capability data for AWS_ACCESS_KEY_ID_1 for an environment.
This data will be stored in the Browser's DOM so Aws_secret_access_key and
Aws_obdi_worker_key have obfuscated values.

```
# Log in

$ ipport="127.0.0.1:443"

$ guid=`curl -ks -d '{"Login":"nomen.nescio","Password":"password"}' \
  https://$ipport/api/login | grep -o "[a-z0-9][^\"]*"`

# Get [not-so-] secret AWS data from the Capability AWS_ACCESS_KEY_ID_1

$ curl -k "https://$ipport/api/nomen.nescio/$guid/aws-p2ec2/get-not-so-secret-data?env_id=1"

```

### osedits-centos6

TODO: Document parameter options.

TODO: Document req params for capability object.

Edits Centos 6 OS.

```
# Log in

$ ipport="127.0.0.1:443"

$ guid=`curl -ks -d '{"Login":"nomen.nescio","Password":"password"}' \
  https://$ipport/api/login | grep -o "[a-z0-9][^\"]*"`

# Edit the OS

$ curl -ks -X POST "https://$ipport/api/nomen.nescio/$guid/aws-p2ec2/osedits?env_id=1&task_id=1&path=/nosnap/centosbox004&force=true&umountdir=true"

```

