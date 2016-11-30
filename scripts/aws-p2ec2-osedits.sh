#!/bin/bash
# Copy a directory tree to a remote server using ssh and cpio.
# Expects:
#   Arguments:
#
#     Arg 1 - IP or DNS name of server to copy to.
#
#   Environment variables:
#
#     REMOTEDIR  - Directory to copy to.
#     PRIVKEYB64 - Private key for accessing server over ssh.
#     REMOTEUSER - User to connect to remote server as.
#     DNSSERVER  - The dns server IP to add to /etc/resolv.conf.
#     DNSDOMAIN  - The dns domain name to add to /etc/resolv.conf.
#     GATEWAY    - Optional. IP address of the gateway for ifcfg-eth0.
#     FORCE      - Optional. Force run even if it's been run before
#                  ("true"|"false").
#     MOUNTDEV   - Optional. Device to mount.
#     MOUNTDIR   - Optional. Directory to mount MOUNTDIR on.
#     UMOUNTDIR  - Optional. Unmount after copy.

export PATH=/sbin:/usr/sbin:$PATH

# For priming ssh
KNOWNHOSTS=~/.ssh/known_hosts
TMPKEYFILE=~/.rsyncbackup-copyfiles.key
SUDO=sudo

# ---------------------------------------------------------------------------
# SANITY CHECKS
# ---------------------------------------------------------------------------

DESTSRV=$1
[[ -z $DESTSRV ]] && {
  echo "Arg 1, the destination server, must be set."
  exit 1
}

[[ -z $REMOTEDIR ]] && {
  echo -n "REMOTEDIR environment variable must be set."
  echo -n " REMOTEDIR is the directory on the remote server"
  echo ", $DESTSRV, where the files will be copied to."
  exit 1
}

[[ -z $PRIVKEYB64 ]] && {
  echo -n "PRIVKEYB64 environment variable must be set."
  echo -n " PRIVKEYB64 is the ssh private key needed to access"
  echo " the remote server, $DESTSRV. The key should be base64"
  echo " encoded, for example, 'base64 -w 0 awskey.pem'."
  exit 1
}

[[ -z $REMOTEUSER ]] && {
  echo -n "REMOTEUSER environment variable must be set."
  echo -n " REMOTEUSER is the user that will be used to connect"
  echo "to the remote server, $DESTSRV, over SSH."
  exit 1
}

# XOR
[[ ( -n $MOUNTDIR || -n $MOUNTDEV ) && \
   ! ( -n $MOUNTDIR && -n $MOUNTDEV ) ]] && {
  echo -n "MOUNTDIR and MOUNTDEV environment variables must"
  echo -n " either both be set, or neither set. These specify"
  echo -n " the device and mount point that will be mounted on"
  echo -n " $DESTSRV.It will not be unmounted after the copy"
  echo " unless UMOUNTDIR environment variable is \"true\"."
  exit 1
}

# XOR
[[ ( -n $DNSSERVER || -n $DNSDOMAIN ) && \
   ! ( -n $DNSSERVER && -n $DNSDOMAIN ) ]] && {
  echo -n "DNSSERVER and DNSDOMAIN environment variables must"
  echo " either both be set, or neither set."
  exit 1
}

for binary in grep cpio ssh ssh-keyscan base64 sudo gzip; do
    if ! which $binary >& /dev/null; then
        echo "ERROR: $binary binary not found in PATH. Aborting."
        exit 1
    fi
done

# ---------------------------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
ssh_cmd() {
# ---------------------------------------------------------------------------
# Run a remote command and exit 1 on failure.
# Arguments: arg1 - server to connect to
#            arg2 - "savestdout" then save output in LAST_STDOUT
#            arg3 - Command and arguments to run
# Returns: Nothing

    [[ $DEBUG -eq 1 ]] && echo "In ssh_cmd()"

    local -i retval=0 t=0 n=0
    local tmpout="/tmp/tmprsyncbackupout_$$.out"
    local tmperr="/tmp/tmprsyncbackuperr_$$.out"
    local tmpret="/tmp/tmprsyncbackupret_$$.out"
    local tmpechod="/tmp/tmprsyncbackupechod_$$.out"

    if [[ $2 == "savestdout" ]]; then
        trap : INT
        echo "> Running remotely: $3"
        ( ssh -tti "$TMPKEYFILE" "$REMOTEUSER@$DESTSRV" "$3" \
          >$tmpout 2>$tmperr;
          echo $? >$tmpret) & waiton=$!;
        ( t=0;n=0
          while true; do
            [[ $n -eq 2 ]] && {
                echo -n "> Waiting ";
                touch $tmpechod;
            }
            [[ $n -gt 2 ]] && echo -n ".";
            sleep $t;
            t=1; n+=1
          done 2>/dev/null;
        ) & killme=$!
        wait $waiton &>/dev/null
        kill $killme &>/dev/null
        wait $killme 2>/dev/null
        [[ -e $tmpechod ]] && {
            rm -f $tmpechod &>/dev/null
            echo
        }
        retval=`cat $tmpret`
        LAST_STDOUT=`cat $tmpout`
        trap - INT
    else
        LAST_STDOUT=
        trap : INT
        echo "> Running remotely: $3"
        ( ssh -tti "$TMPKEYFILE" "$REMOTEUSER@$DESTSRV" "$3" \
          >$tmpout 2>$tmperr;
          echo $? >$tmpret) & waiton=$!;
        ( t=0;n=0
          while true; do
            [[ $n -eq 2 ]] && {
                echo -n "> Waiting ";
                touch $tmpechod;
            }
            [[ $n -gt 2 ]] && echo -n ".";
            sleep $t;
            t=1; n+=1
          done 2>/dev/null;
        ) & killme=$!
        wait $waiton &>/dev/null
        kill $killme &>/dev/null
        wait $killme 2>/dev/null
        [[ -e $tmpechod ]] && {
            rm -f $tmpechod &>/dev/null
            echo
        }
        retval=`cat $tmpret`
        trap - INT
    fi

    [[ $retval -ne 0 ]] && {
        echo
        echo -e "${R}ERROR$N: Command failed on '$1'. Command was:"
        echo
        echo "  $3"
        echo
        echo "OUTPUT WAS:"
        echo "  $LAST_STDOUT"
        echo "  $(cat $tmperr | sed 's/^/  /')"
        echo
        echo "Cannot continue. Aborting."
        echo
        exit 1
    }
}

# ---------------------------------------------------------------------------
cleanup() {
# ---------------------------------------------------------------------------
    rm -f $TMPKEYFILE &>/dev/null
}

# ---------------------------------------------------------------------------
# PRIME SSH
# ---------------------------------------------------------------------------

touch $KNOWNHOSTS
if ! grep -qs $DESTSRV $KNOWNHOSTS; then
    # Add the server to known_hosts
    echo "ssh-keyscan $DESTSRV >> $KNOWNHOSTS"
    ssh-keyscan $DESTSRV >> $KNOWNHOSTS
fi

trap cleanup EXIT

echo "$PRIVKEYB64" | base64 -d >$TMPKEYFILE
chmod 0600 $TMPKEYFILE

# ---------------------------------------------------------------------------
# (MAYBE) MOUNT THE DIRECTORY
# ---------------------------------------------------------------------------

[[ -n $MOUNTDIR && -n $MOUNTDEV ]] && {

    ssh_cmd $DESTSRV savestdout \
        "mountpoint -q $MOUNTDIR && echo mounted || echo notmounted"

    [[ $LAST_STDOUT == "mounted" ]] && {
        echo "ERROR: Directory is already mounted. Cannot continue."
        exit 1
    }

    ssh_cmd $DESTSRV savestdout \
        "ls $MOUNTDEV || echo notok"

    [[ $LAST_STDOUT == "notok" ]] && {

        MOUNTDEV="/dev/xvd${MOUNTDEV#/dev/sd}"

        ssh_cmd $DESTSRV savestdout \
            "ls $MOUNTDEV || echo notok"

        [[ $LAST_STDOUT == "notok" ]] && {
            MOUNTDEV="/dev/hd${MOUNTDEV#/dev/xvd}"

            ssh_cmd $DESTSRV savestdout \
                "ls $MOUNTDEV || echo notok"

            [[ $LAST_STDOUT == "notok" ]] && {
                echo "ERROR: Could not find device $MOUNTDEV. Cannot continue."
                exit 1
            }
        }
    }

    # Should use parted and gpt instead of fdisk
    ssh_cmd $DESTSRV savestdout \
        "$SUDO fdisk $MOUNTDEV < <(echo -e 'n\np\n1\n\n\np\nw\nq')"

    MOUNTPART=${MOUNTDEV}1

    ssh_cmd $DESTSRV savestdout \
        "$SUDO mkfs.ext4 -m1 $MOUNTPART || echo notok"

    [[ $LAST_STDOUT == "notok" ]] && {
        echo "ERROR: Could not create ext4 filesystem. Cannot continue."
        exit 1
    }

    ssh_cmd $DESTSRV savestdout \
        "$SUDO mkdir -p $MOUNTDIR"

    [[ $LAST_STDOUT == "notok" ]] && {
        echo "ERROR: Could not create mountpoint, '$MOUNTDIR'. Cannot continue."
        exit 1
    }

    ssh_cmd $DESTSRV savestdout \
        "$SUDO mount $MOUNTPART $MOUNTDIR"

    [[ $LAST_STDOUT == "notok" ]] && {
        echo "ERROR: Could not mount filesystem. Cannot continue."
        exit 1
    }
}

# ---------------------------------------------------------------------------
# OS EDITS
# ---------------------------------------------------------------------------

# remove double slashes
REMOTEDIR=$(echo "$REMOTEDIR" | sed 's#//*#/#g')
# remove trailing slash
REMOTEDIR=${REMOTEDIR%/}

cd /tmp

# check for mark

if [[ $FORCE == "true" ]]; then
	echo "> NOT checking for mark. This may have been done before..."
else
	echo "> Checking for mark"

	ssh_cmd $DESTSRV savestdout \
		"$SUDO test -e $REMOTEDIR/.aws-p2ec2_edited_this_fs || echo ok"

	[[ $LAST_STDOUT != "ok" ]] && {
		echo "ERROR: File exists. Cannot continue."
		exit 1
	}
fi
 
# mark

echo "> Marking filesystem as edited"

ssh_cmd $DESTSRV savestdout \
    "$SUDO touch $REMOTEDIR/.aws-p2ec2_edited_this_fs"

# find mount device

echo "> Getting mount device "

ssh_cmd $DESTSRV savestdout \
    "cat /proc/mounts | grep '$REMOTEDIR '"

[[ -z $LAST_STDOUT ]] && {
	echo "ERROR: Command returned no output! Cannot continue."
	exit 1
}

CHROOTDIR=$(echo "$LAST_STDOUT" | cut -d ' ' -f2)
CHROOTDEV=$(echo "$LAST_STDOUT" | cut -d ' ' -f1)

echo "> CHROOTDIR=$CHROOTDIR, CHROOTDEV=$CHROOTDEV"

MOUNTDIR=$CHROOTDIR

# unmount dev proc sys

ssh_cmd $DESTSRV nosave \
    "$SUDO umount $CHROOTDIR/* || true"

# kernel version

echo "> Getting kernel version"

ssh_cmd $DESTSRV savestdout \
    "$SUDO chroot $CHROOTDIR cat /boot/grub/grub.conf | sed -n '/^[[:space:]]*initrd/ { s/^.*initramfs-\(.*\).img/\1/p;q }'"

KERNEL=$LAST_STDOUT
[[ -z $KERNEL ]] && {
	echo "ERROR: Command returned no output! Cannot continue."
	exit 1
}

echo "> KERNEL=$KERNEL"

# blkid

echo "> Getting filesystem ID for "

ssh_cmd $DESTSRV savestdout \
    "$SUDO blkid $CHROOTDEV | cut -d ' ' -f2 | tr -d \\\""

FSBLKID=$LAST_STDOUT
[[ -z $KERNEL ]] && {
	echo "ERROR: Command returned no output! Cannot continue."
	exit 1
}

echo "> FSBLKID=$FSBLKID"

# GRUB edits

echo "> Editing $CHROOTDIR/boot/grub/grub.conf"

grubconf=$(cat <<EnD
default=0
timeout=1
serial --unit=0 --speed=115200
terminal --timeout=1 serial console
title CentOS ($KERNEL)
        root (hd0,0)
        kernel /boot/vmlinuz-$KERNEL ro root=$FSBLKID rd_NO_LVM rd_NO_LUKS LANG=en_US.UTF-8 rd_NO_MD SYSFONT=latarcyrheb-sun16 console=ttyS0,115200 crashkernel=auto KEYBOARDTYPE=pc KEYTABLE=us rd_NO_DM
        initrd /boot/initramfs-$KERNEL.img
EnD
)

ssh_cmd $DESTSRV savestdout \
    "$SUDO bash -c 'cat <<EnD >$CHROOTDIR/boot/grub/grub.conf
$grubconf
EnD'"

# FSTAB edits

echo "> Editing $CHROOTDIR/etc/fstab"

fstab=$(cat <<EnD
#
# /etc/fstab
# Created by anaconda on Mon Feb 23 12:24:41 2015
#
# Accessible filesystems, by reference, are maintained under '/dev/disk'
# See man pages fstab(5), findfs(8), mount(8) and/or blkid(8) for more info
#
$FSBLKID /                       ext4    defaults        1 1
#UUID=6885046d-5a30-40c8-967e-f4392b00c6a6 swap                    swap    defaults        0 0
tmpfs                   /dev/shm                tmpfs   defaults        0 0
devpts                  /dev/pts                devpts  gid=5,mode=620  0 0
sysfs                   /sys                    sysfs   defaults        0 0
proc                    /proc                   proc    defaults        0 0
EnD
)

ssh_cmd $DESTSRV savestdout \
    "$SUDO bash -c 'cat <<EnD >$CHROOTDIR/etc/fstab
$fstab
EnD'"

# dns

[[ -n $DNSSERVER ]] && {
	echo "> Checking $CHROOTDIR/etc/resolv.conf "

	ssh_cmd $DESTSRV savestdout \
		"$SUDO grep -qs "^nameserver.*$DNSSERVER" $CHROOTDIR/etc/resolv.conf || echo doit"

	if [[ $LAST_STDOUT == "doit" ]]; then
		echo "> Writing $CHROOTDIR/etc/resolv.conf "
		ssh_cmd $DESTSRV savestdout \
			"$SUDO bash -c \"chattr -i $CHROOTDIR/etc/resolv.conf; echo -e \\\"search $DNSDOMAIN\\nnameserver $DNSSERVER\\\" >$CHROOTDIR/etc/resolv.conf; chattr +i $CHROOTDIR/etc/resolv.conf;\""
	else
		echo "> $CHROOTDIR/etc/resolv.conf looks to be correct. skipping."
	fi
}

# Grub stuff

echo "> Setting up Grub"

ssh_cmd $DESTSRV savestdout \
	"$SUDO bash -c \"mount --bind /dev $CHROOTDIR/dev/ && mount --bind /proc/ $CHROOTDIR/proc/ && mount --bind /sys/ $CHROOTDIR/sys/\""

ssh_cmd $DESTSRV savestdout \
    "$SUDO chroot $CHROOTDIR /sbin/grub < <(echo -e \"device (hd0) ${CHROOTDEV%[0-9]}\\nroot (hd0,0)\\nsetup (hd0)\\nquit\")"

echo "$LAST_STDOUT"

ssh_cmd $DESTSRV savestdout \
    "$SUDO >$CHROOTDIR/etc/udev/rules.d/70-persistent-net.rules || true"

ssh_cmd $DESTSRV savestdout \
    "$SUDO chroot $CHROOTDIR bash -c \"for i in /boot/initramfs*; do a=\\\${i%.img}; a=\\\${a#/boot/initramfs-}; dracut -f \\\$i \\\$a; done\""

ssh_cmd $DESTSRV savestdout \
    "$SUDO touch $CHROOTDIR/.autorelabel"

echo "> Disabling services"

ssh_cmd $DESTSRV savestdout \
    "$SUDO chroot $CHROOTDIR bash -c \"chkconfig --list --type sysv | awk '{ print \\\$1; }' | grep -ve sshd -e crond -e network -e nrpe -e ntpd -e ntpdate -e xinetd | while read a b; do chkconfig \\\$a off; done\""

fstab=$(cat <<EnD
DEVICE=eth0
BOOTPROTO=dhcp
IPV6INIT=yes
ONBOOT=yes
TYPE=Ethernet
# Extra options
#MTU=1500
#NM_CONTROLLED=yes
#USERCTL=yes
#PEERDNS=yes
#IPV6INIT=no
#DHCPV6C=yes
#DHCPV6C_OPTIONS=-nw
#PERSISTENT_DHCLIENT=yes
#RES_OPTIONS="timeout:2 attempts:5"
#DHCP_ARP_CHECK=no
EnD
)

[[ -n $GATEWAY ]] && {
    fstab=$(echo "$fstab";echo "GATEWAY=$GATEWAY")
}

ssh_cmd $DESTSRV savestdout \
    "$SUDO bash -c 'cat <<EnD >$CHROOTDIR/etc/sysconfig/network-scripts/ifcfg-eth0
$fstab
EnD'"

# unmount dev proc sys

ssh_cmd $DESTSRV nosave \
    "$SUDO umount $CHROOTDIR/* || true"

# ---------------------------------------------------------------------------
# (MAYBE) UNMOUNT THE DIRECTORY
# ---------------------------------------------------------------------------

[[ -n $UMOUNTDIR ]] && {

    ssh_cmd $DESTSRV savestdout \
        "$SUDO fuser -kma $MOUNTDIR || true"

    ssh_cmd $DESTSRV savestdout \
        "$SUDO umount $MOUNTDIR/* || true"

    ssh_cmd $DESTSRV savestdout \
        "$SUDO umount $MOUNTDIR"

    [[ $LAST_STDOUT == "notok" ]] && {
        echo "ERROR: Could not mount filesystem. Cannot continue."
        exit 1
    }
}

# Output in JSON format
echo "Copy completed successfully."

exit 0
